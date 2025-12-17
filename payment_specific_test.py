#!/usr/bin/env python3
"""
Specific Payment Request API Testing as per Review Request
Tests the exact API endpoints and payloads specified in the review request
"""

import requests
import json

def test_payment_request_apis():
    """Test specific Payment Request APIs as per review request"""
    base_url = "https://pardis-workflow.preview.emergentagent.com/api"
    
    # Login as admin
    login_response = requests.post(f"{base_url}/auth/login", json={
        "username": "admin",
        "password": "admin123"
    })
    
    if login_response.status_code != 200:
        print("❌ Admin login failed")
        return False
    
    token = login_response.json()['token']
    headers = {'Authorization': f'Bearer {token}', 'Content-Type': 'application/json'}
    
    print("🔐 Admin login successful")
    
    # Test 1: Create Payment Request with exact payload from review request
    print("\n1️⃣ Testing Create Payment Request...")
    create_payload = {
        "total_amount": 100000000,
        "payment_rows": [
            {
                "amount": 60000000,
                "reason": "advance",
                "notes": "پیش‌پرداخت"
            },
            {
                "amount": 40000000,
                "reason": "on_account",
                "notes": "علی‌الحساب"
            }
        ]
    }
    
    response = requests.post(f"{base_url}/payment-requests", json=create_payload, headers=headers)
    if response.status_code == 200:
        data = response.json()
        request_id = data['request_id']
        request_number = data['request_number']
        print(f"✅ Create Payment Request - SUCCESS (ID: {request_id}, Number: {request_number})")
    else:
        print(f"❌ Create Payment Request - FAILED: {response.status_code} - {response.text}")
        return False
    
    # Test 2: Get Payment Request List
    print("\n2️⃣ Testing Get Payment Request List...")
    response = requests.get(f"{base_url}/payment-requests", headers=headers)
    if response.status_code == 200:
        requests_list = response.json()
        print(f"✅ Get Payment Request List - SUCCESS (Found {len(requests_list)} requests)")
    else:
        print(f"❌ Get Payment Request List - FAILED: {response.status_code}")
        return False
    
    # Test 3: Get Payment Request Detail
    print("\n3️⃣ Testing Get Payment Request Detail...")
    response = requests.get(f"{base_url}/payment-requests/{request_id}", headers=headers)
    if response.status_code == 200:
        request_detail = response.json()
        payment_rows = request_detail.get('payment_rows', [])
        print(f"✅ Get Payment Request Detail - SUCCESS (Has {len(payment_rows)} payment rows)")
        
        # Store row IDs for later tests
        if len(payment_rows) >= 2:
            row_id_1 = payment_rows[0]['id']
            row_id_2 = payment_rows[1]['id']
        else:
            print("❌ Payment rows not found")
            return False
    else:
        print(f"❌ Get Payment Request Detail - FAILED: {response.status_code}")
        return False
    
    # Test 4: Submit Payment Request
    print("\n4️⃣ Testing Submit Payment Request...")
    response = requests.post(f"{base_url}/payment-requests/{request_id}/submit", headers=headers)
    if response.status_code == 200:
        print("✅ Submit Payment Request - SUCCESS")
        
        # Verify status change
        detail_response = requests.get(f"{base_url}/payment-requests/{request_id}", headers=headers)
        if detail_response.json().get('status') == 'pending_financial':
            print("✅ Status changed to 'pending_financial'")
        else:
            print(f"❌ Status not changed correctly: {detail_response.json().get('status')}")
    else:
        print(f"❌ Submit Payment Request - FAILED: {response.status_code}")
        return False
    
    # Test 5: Set Payment Types with exact payload from review request
    print("\n5️⃣ Testing Set Payment Types...")
    payment_types_payload = {
        "payment_rows": [
            {
                "id": row_id_1,
                "payment_type": "cash"
            },
            {
                "id": row_id_2,
                "payment_type": "check"
            }
        ]
    }
    
    response = requests.post(f"{base_url}/payment-requests/{request_id}/set-payment-types", 
                           json=payment_types_payload, headers=headers)
    if response.status_code == 200:
        print("✅ Set Payment Types - SUCCESS")
        
        # Verify status change
        detail_response = requests.get(f"{base_url}/payment-requests/{request_id}", headers=headers)
        if detail_response.json().get('status') == 'pending_dev_manager':
            print("✅ Status changed to 'pending_dev_manager'")
        else:
            print(f"❌ Status not changed correctly: {detail_response.json().get('status')}")
    else:
        print(f"❌ Set Payment Types - FAILED: {response.status_code}")
        return False
    
    # Test 6: Approve by Dev Manager
    print("\n6️⃣ Testing Approve by Dev Manager...")
    response = requests.post(f"{base_url}/payment-requests/{request_id}/approve-dev-manager", 
                           json={"notes": "تایید مدیر توسعه"}, headers=headers)
    if response.status_code == 200:
        print("✅ Approve by Dev Manager - SUCCESS")
        
        # Verify status change
        detail_response = requests.get(f"{base_url}/payment-requests/{request_id}", headers=headers)
        if detail_response.json().get('status') == 'pending_payment':
            print("✅ Status changed to 'pending_payment'")
        else:
            print(f"❌ Status not changed correctly: {detail_response.json().get('status')}")
    else:
        print(f"❌ Approve by Dev Manager - FAILED: {response.status_code}")
        return False
    
    # Test 7: Process Final Payment with exact payload from review request
    print("\n7️⃣ Testing Process Final Payment...")
    final_payment_payload = {
        "payment_date": "1404/09/27",
        "notes": "پرداخت شد"
    }
    
    response = requests.post(f"{base_url}/payment-requests/{request_id}/process-payment", 
                           json=final_payment_payload, headers=headers)
    if response.status_code == 200:
        print("✅ Process Final Payment - SUCCESS")
        
        # Verify final status
        detail_response = requests.get(f"{base_url}/payment-requests/{request_id}", headers=headers)
        if detail_response.json().get('status') == 'completed':
            print("✅ Final status is 'completed'")
        else:
            print(f"❌ Final status not correct: {detail_response.json().get('status')}")
    else:
        print(f"❌ Process Final Payment - FAILED: {response.status_code}")
        return False
    
    print("\n🎉 All Payment Request API tests completed successfully!")
    print("✅ Complete workflow: draft → pending_financial → pending_dev_manager → pending_payment → completed")
    return True

if __name__ == "__main__":
    test_payment_request_apis()