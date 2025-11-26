# این فایل شامل endpoints فرم پیشنهاد پروژه است
# باید به server.py اضافه شود

"""
# Project Proposal Endpoints
@api_router.post("/project-proposals")
async def create_project_proposal(proposal_data: ProjectProposalCreate, current_user: dict = Depends(get_current_user)):
    proposal_number = await get_next_proposal_number()
    
    proposal = ProjectProposal(
        proposal_number=proposal_number,
        proposer_id=current_user['user_id'],
        proposer_name=current_user['full_name'],
        title=proposal_data.title,
        objective=proposal_data.objective,
        project_type=proposal_data.project_type,
        description=proposal_data.description,
        documents=proposal_data.documents,
        status=ProposalStatus.DRAFT,
        history=[ProposalHistory(
            action=ProposalActionType.CREATED,
            actor_id=current_user['user_id'],
            actor_name=current_user['full_name'],
            to_status=ProposalStatus.DRAFT
        )]
    )
    
    doc = proposal.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    for i, hist in enumerate(doc['history']):
        doc['history'][i]['timestamp'] = hist['timestamp'].isoformat()
    
    await db.project_proposals.insert_one(doc)
    
    return {"message": "Proposal created", "proposal_id": proposal.id, "proposal_number": proposal_number}

@api_router.get("/project-proposals")
async def get_project_proposals(current_user: dict = Depends(get_current_user)):
    user_roles = current_user.get('roles', [])
    user_id = current_user['user_id']
    
    query = {}
    if UserRole.ADMIN not in user_roles:
        if UserRole.REQUESTER in user_roles and len([r for r in user_roles if r in ['coo', 'dev_manager', 'project_control']]) == 0:
            query['proposer_id'] = user_id
    
    proposals = await db.project_proposals.find(query, {"_id": 0}).to_list(1000)
    return proposals

@api_router.get("/project-proposals/{proposal_id}")
async def get_project_proposal(proposal_id: str, current_user: dict = Depends(get_current_user)):
    proposal = await db.project_proposals.find_one({"id": proposal_id}, {"_id": 0})
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    return proposal

@api_router.put("/project-proposals/{proposal_id}")
async def update_project_proposal(proposal_id: str, proposal_data: ProjectProposalUpdate, current_user: dict = Depends(get_current_user)):
    proposal = await db.project_proposals.find_one({"id": proposal_id})
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if proposal['proposer_id'] != current_user['user_id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    if proposal['status'] != ProposalStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Can only edit draft proposals")
    
    update_data = {"updated_at": datetime.now(timezone.utc).isoformat()}
    if proposal_data.title:
        update_data['title'] = proposal_data.title
    if proposal_data.objective:
        update_data['objective'] = proposal_data.objective
    if proposal_data.project_type:
        update_data['project_type'] = proposal_data.project_type
    if proposal_data.description is not None:
        update_data['description'] = proposal_data.description
    if proposal_data.documents is not None:
        update_data['documents'] = proposal_data.documents
    
    await db.project_proposals.update_one({"id": proposal_id}, {"$set": update_data})
    return {"message": "Proposal updated"}

@api_router.post("/project-proposals/{proposal_id}/submit")
async def submit_proposal(proposal_id: str, current_user: dict = Depends(get_current_user)):
    proposal = await db.project_proposals.find_one({"id": proposal_id})
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if proposal['proposer_id'] != current_user['user_id']:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    if proposal['status'] != ProposalStatus.DRAFT:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Proposal already submitted")
    
    history_entry = ProposalHistory(
        action=ProposalActionType.SUBMITTED,
        actor_id=current_user['user_id'],
        actor_name=current_user['full_name'],
        from_status=ProposalStatus.DRAFT,
        to_status=ProposalStatus.PENDING_COO
    )
    
    await db.project_proposals.update_one(
        {"id": proposal_id},
        {
            "$set": {
                "status": ProposalStatus.PENDING_COO,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "history": {
                    **history_entry.model_dump(),
                    "timestamp": history_entry.timestamp.isoformat()
                }
            }
        }
    )
    
    # Notify COO
    coo_users = await db.users.find({"roles": UserRole.COO}).to_list(100)
    for user in coo_users:
        await create_notification(
            user['id'],
            proposal_id,
            proposal['proposal_number'],
            f"پیشنهاد پروژه جدید: {proposal['title']}"
        )
    
    return {"message": "Proposal submitted"}

@api_router.post("/project-proposals/{proposal_id}/coo-review")
async def coo_review_proposal(proposal_id: str, review: COOReview, current_user: dict = Depends(get_current_user)):
    if UserRole.COO not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    proposal = await db.project_proposals.find_one({"id": proposal_id})
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if proposal['status'] != ProposalStatus.PENDING_COO:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    if review.is_aligned:
        # تایید هم‌راستایی
        history_entry = ProposalHistory(
            action=ProposalActionType.APPROVED_BY_COO,
            actor_id=current_user['user_id'],
            actor_name=current_user['full_name'],
            from_status=ProposalStatus.PENDING_COO,
            to_status=ProposalStatus.PENDING_DEV_MANAGER,
            notes=review.notes
        )
        
        await db.project_proposals.update_one(
            {"id": proposal_id},
            {
                "$set": {
                    "is_aligned": True,
                    "coo_notes": review.notes,
                    "coo_reviewed_at": datetime.now(timezone.utc).isoformat(),
                    "status": ProposalStatus.PENDING_DEV_MANAGER,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {
                    "history": {
                        **history_entry.model_dump(),
                        "timestamp": history_entry.timestamp.isoformat()
                    }
                }
            }
        )
        
        # Notify dev manager
        dev_managers = await db.users.find({"roles": UserRole.DEV_MANAGER}).to_list(100)
        for user in dev_managers:
            await create_notification(
                user['id'],
                proposal_id,
                proposal['proposal_number'],
                f"پیشنهاد پروژه {proposal['title']} نیاز به تعیین مسئول امکان‌سنجی دارد"
            )
        
        return {"message": "Proposal approved by COO"}
    else:
        # رد پیشنهاد
        history_entry = ProposalHistory(
            action=ProposalActionType.REJECTED_BY_COO,
            actor_id=current_user['user_id'],
            actor_name=current_user['full_name'],
            from_status=ProposalStatus.PENDING_COO,
            to_status=ProposalStatus.REJECTED_BY_COO,
            notes=review.notes
        )
        
        await db.project_proposals.update_one(
            {"id": proposal_id},
            {
                "$set": {
                    "is_aligned": False,
                    "coo_notes": review.notes,
                    "coo_reviewed_at": datetime.now(timezone.utc).isoformat(),
                    "status": ProposalStatus.REJECTED_BY_COO,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                },
                "$push": {
                    "history": {
                        **history_entry.model_dump(),
                        "timestamp": history_entry.timestamp.isoformat()
                    }
                }
            }
        )
        
        # Notify proposer
        await create_notification(
            proposal['proposer_id'],
            proposal_id,
            proposal['proposal_number'],
            f"پیشنهاد پروژه {proposal['title']} رد شد"
        )
        
        return {"message": "Proposal rejected by COO"}

@api_router.post("/project-proposals/{proposal_id}/assign-manager")
async def assign_feasibility_manager(proposal_id: str, assignment: AssignFeasibilityManager, current_user: dict = Depends(get_current_user)):
    if UserRole.DEV_MANAGER not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    proposal = await db.project_proposals.find_one({"id": proposal_id})
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if proposal['status'] != ProposalStatus.PENDING_DEV_MANAGER:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    history_entry = ProposalHistory(
        action=ProposalActionType.ASSIGNED_FEASIBILITY_MANAGER,
        actor_id=current_user['user_id'],
        actor_name=current_user['full_name'],
        from_status=ProposalStatus.PENDING_DEV_MANAGER,
        to_status=ProposalStatus.PENDING_PROJECT_CONTROL,
        notes=f"مسئول امکان‌سنجی: {assignment.feasibility_manager_name}"
    )
    
    await db.project_proposals.update_one(
        {"id": proposal_id},
        {
            "$set": {
                "feasibility_manager_id": assignment.feasibility_manager_id,
                "feasibility_manager_name": assignment.feasibility_manager_name,
                "dev_manager_notes": assignment.notes,
                "dev_manager_assigned_at": datetime.now(timezone.utc).isoformat(),
                "status": ProposalStatus.PENDING_PROJECT_CONTROL,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "history": {
                    **history_entry.model_dump(),
                    "timestamp": history_entry.timestamp.isoformat()
                }
            }
        }
    )
    
    # Notify project control
    control_users = await db.users.find({"roles": UserRole.PROJECT_CONTROL}).to_list(100)
    for user in control_users:
        await create_notification(
            user['id'],
            proposal_id,
            proposal['proposal_number'],
            f"پیشنهاد پروژه {proposal['title']} نیاز به ثبت رسمی و کد پروژه دارد"
        )
    
    return {"message": "Feasibility manager assigned"}

@api_router.post("/project-proposals/{proposal_id}/register")
async def register_project(proposal_id: str, registration: RegisterProject, current_user: dict = Depends(get_current_user)):
    if UserRole.PROJECT_CONTROL not in current_user.get('roles', []):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN)
    
    proposal = await db.project_proposals.find_one({"id": proposal_id})
    if not proposal:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND)
    
    if proposal['status'] != ProposalStatus.PENDING_PROJECT_CONTROL:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid status")
    
    history_entry = ProposalHistory(
        action=ProposalActionType.REGISTERED_PROJECT,
        actor_id=current_user['user_id'],
        actor_name=current_user['full_name'],
        from_status=ProposalStatus.PENDING_PROJECT_CONTROL,
        to_status=ProposalStatus.REGISTERED,
        notes=f"کد پروژه: {registration.project_code}"
    )
    
    await db.project_proposals.update_one(
        {"id": proposal_id},
        {
            "$set": {
                "project_code": registration.project_code,
                "project_start_date": registration.project_start_date,
                "control_notes": registration.notes,
                "registered_at": datetime.now(timezone.utc).isoformat(),
                "status": ProposalStatus.REGISTERED,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$push": {
                "history": {
                    **history_entry.model_dump(),
                    "timestamp": history_entry.timestamp.isoformat()
                }
            }
        }
    )
    
    # Notify feasibility manager
    if proposal.get('feasibility_manager_id'):
        await create_notification(
            proposal['feasibility_manager_id'],
            proposal_id,
            proposal['proposal_number'],
            f"پروژه {proposal['title']} با کد {registration.project_code} ثبت شد"
        )
    
    # Notify proposer
    await create_notification(
        proposal['proposer_id'],
        proposal_id,
        proposal['proposal_number'],
        f"پیشنهاد پروژه شما با کد {registration.project_code} ثبت شد"
    )
    
    return {"message": "Project registered successfully", "project_code": registration.project_code}
"""
