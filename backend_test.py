#!/usr/bin/env python3
"""
Comprehensive Backend API Testing for Persian Organizational Portal
Tests JWT authentication, user management, and complete goods procurement workflow
"""

import requests
import sys
import json
from datetime import datetime
from typing import Dict, Any, Optional

class PersianPortalAPITester:
    def __init__(self, base_url="https://workflow-hub-124.preview.emergentagent.com/api"):
        self.base_url = base_url
        self.admin_token = None
        self.test_users = {}
        self.test_request_id = None
        self.test_request_number = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_test(self, name: str, success: bool, details: str = ""):
        """Log test results"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {name} - PASSED")
        else:
            self.failed_tests.append({"name": name, "details": details})
            print(f"❌ {name} - FAILED: {details}")

    def make_request(self, method: str, endpoint: str, data: Dict = None, 
                    token: str = None, expected_status: int = 200) -> tuple[bool, Dict]:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}/{endpoint}"
        headers = {'Content-Type': 'application/json'}
        
        if token:
            headers['Authorization'] = f'Bearer {token}'

        try:
            if method == 'GET':
                response = requests.get(url, headers=headers, timeout=30)
            elif method == 'POST':
                response = requests.post(url, json=data, headers=headers, timeout=30)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers, timeout=30)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers, timeout=30)
            else:
                return False, {"error": f"Unsupported method: {method}"}

            success = response.status_code == expected_status
            try:
                response_data = response.json()
            except:
                response_data = {"status_code": response.status_code, "text": response.text}

            return success, response_data

        except requests.exceptions.RequestException as e:
            return False, {"error": str(e)}

    def test_admin_login(self):
        """Test admin login with default credentials"""
        print("\n🔐 Testing Admin Authentication...")
        
        success, response = self.make_request(
            'POST', 'auth/login',
            data={"username": "admin", "password": "admin123"}
        )
        
        if success and 'token' in response:
            self.admin_token = response['token']
            self.log_test("Admin Login", True)
            return True
        else:
            self.log_test("Admin Login", False, f"Response: {response}")
            return False

    def test_user_management(self):
        """Test user creation and management"""
        print("\n👥 Testing User Management...")
        
        if not self.admin_token:
            self.log_test("User Management", False, "No admin token available")
            return False

        # Test creating users with different roles
        test_users_data = [
            {
                "username": "test_requester",
                "full_name": "متقاضی تست",
                "password": "test123",
                "roles": ["requester"]
            },
            {
                "username": "test_procurement", 
                "full_name": "واحد تامین تست",
                "password": "test123",
                "roles": ["procurement"]
            },
            {
                "username": "test_management",
                "full_name": "مدیریت تست", 
                "password": "test123",
                "roles": ["management"]
            },
            {
                "username": "test_financial",
                "full_name": "واحد مالی تست",
                "password": "test123", 
                "roles": ["financial"]
            }
        ]

        for user_data in test_users_data:
            success, response = self.make_request(
                'POST', 'auth/register',
                data=user_data,
                token=self.admin_token,
                expected_status=200
            )
            
            if success:
                # Login with new user to get token
                login_success, login_response = self.make_request(
                    'POST', 'auth/login',
                    data={"username": user_data["username"], "password": user_data["password"]}
                )
                
                if login_success and 'token' in login_response:
                    self.test_users[user_data["username"]] = {
                        "token": login_response['token'],
                        "user_data": login_response['user'],
                        "roles": user_data["roles"]
                    }
                    self.log_test(f"Create and Login {user_data['username']}", True)
                else:
                    self.log_test(f"Login {user_data['username']}", False, f"Login failed: {login_response}")
            else:
                self.log_test(f"Create {user_data['username']}", False, f"Creation failed: {response}")

        # Test getting users list
        success, response = self.make_request(
            'GET', 'users',
            token=self.admin_token
        )
        
        if success and isinstance(response, list):
            self.log_test("Get Users List", True)
        else:
            self.log_test("Get Users List", False, f"Response: {response}")

        return len(self.test_users) >= 3

    def test_cost_centers(self):
        """Test cost centers endpoint"""
        print("\n🏢 Testing Cost Centers...")
        
        if not self.test_users.get("test_requester"):
            self.log_test("Cost Centers", False, "No test requester available")
            return False

        success, response = self.make_request(
            'GET', 'cost-centers',
            token=self.test_users["test_requester"]["token"]
        )
        
        if success and isinstance(response, list) and len(response) > 0:
            self.log_test("Get Cost Centers", True)
            return True
        else:
            self.log_test("Get Cost Centers", False, f"Response: {response}")
            return False

    def test_goods_request_workflow(self):
        """Test complete goods request workflow"""
        print("\n📦 Testing Complete Goods Request Workflow...")
        
        # Step 1: Create request as requester
        if not self.test_users.get("test_requester"):
            self.log_test("Workflow - Create Request", False, "No test requester available")
            return False

        request_data = {
            "item_name": "لپ‌تاپ Dell",
            "quantity": 2,
            "cost_center": "دفتر",
            "description": "لپ‌تاپ برای واحد IT"
        }

        success, response = self.make_request(
            'POST', 'goods-requests',
            data=request_data,
            token=self.test_users["test_requester"]["token"],
            expected_status=200
        )

        if success and 'request_id' in response and 'request_number' in response:
            self.test_request_id = response['request_id']
            self.test_request_number = response['request_number']
            self.log_test("Workflow - Create Request", True)
            
            # Verify request number format (1404-X)
            if response['request_number'].startswith('1404-'):
                self.log_test("Request Number Format", True)
            else:
                self.log_test("Request Number Format", False, f"Invalid format: {response['request_number']}")
        else:
            self.log_test("Workflow - Create Request", False, f"Response: {response}")
            return False

        # Step 2: Submit request
        success, response = self.make_request(
            'POST', f'goods-requests/{self.test_request_id}/submit',
            token=self.test_users["test_requester"]["token"]
        )
        
        if success:
            self.log_test("Workflow - Submit Request", True)
        else:
            self.log_test("Workflow - Submit Request", False, f"Response: {response}")

        # Step 3: Add inquiries as procurement
        if not self.test_users.get("test_procurement"):
            self.log_test("Workflow - Add Inquiries", False, "No test procurement user")
            return False

        inquiries_data = [
            {"unit_price": 25000000, "quantity": 2, "total_price": 50000000},
            {"unit_price": 24000000, "quantity": 2, "total_price": 48000000},
            {"unit_price": 26000000, "quantity": 2, "total_price": 52000000}
        ]

        success, response = self.make_request(
            'POST', f'goods-requests/{self.test_request_id}/inquiries',
            data=inquiries_data,
            token=self.test_users["test_procurement"]["token"]
        )
        
        if success:
            self.log_test("Workflow - Add Inquiries", True)
        else:
            self.log_test("Workflow - Add Inquiries", False, f"Response: {response}")

        # Step 4: Get request details to find inquiry IDs
        success, response = self.make_request(
            'GET', f'goods-requests/{self.test_request_id}',
            token=self.test_users["test_management"]["token"]
        )
        
        if success and 'inquiries' in response and len(response['inquiries']) == 3:
            self.log_test("Workflow - Get Request Details", True)
            
            # Step 5: Select winning inquiry as management
            winning_inquiry_id = response['inquiries'][1]['id']  # Select second inquiry
            
            success, response = self.make_request(
                'POST', f'goods-requests/{self.test_request_id}/select-inquiry',
                data={"inquiry_id": winning_inquiry_id},
                token=self.test_users["test_management"]["token"]
            )
            
            if success:
                self.log_test("Workflow - Select Winning Inquiry", True)
            else:
                self.log_test("Workflow - Select Winning Inquiry", False, f"Response: {response}")
        else:
            self.log_test("Workflow - Get Request Details", False, f"Response: {response}")

        # Step 6: Add receipt as procurement
        receipt_data = {
            "quantity": 2,
            "unit_price": 24000000,
            "total_price": 48000000
        }

        success, response = self.make_request(
            'POST', f'goods-requests/{self.test_request_id}/receipts',
            data=receipt_data,
            token=self.test_users["test_procurement"]["token"]
        )
        
        if success and 'receipt_number' in response:
            self.log_test("Workflow - Add Receipt", True)
            receipt_number = response['receipt_number']
            
            # Get receipt ID for confirmations
            success, response = self.make_request(
                'GET', f'goods-requests/{self.test_request_id}',
                token=self.test_users["test_procurement"]["token"]
            )
            
            if success and 'receipts' in response and len(response['receipts']) > 0:
                receipt_id = response['receipts'][0]['id']
                
                # Step 7: Confirm receipt by procurement
                success, response = self.make_request(
                    'POST', f'goods-requests/{self.test_request_id}/receipts/confirm-procurement',
                    data={"receipt_id": receipt_id},
                    token=self.test_users["test_procurement"]["token"]
                )
                
                if success:
                    self.log_test("Workflow - Confirm Receipt (Procurement)", True)
                else:
                    self.log_test("Workflow - Confirm Receipt (Procurement)", False, f"Response: {response}")

                # Step 8: Confirm receipt by requester
                success, response = self.make_request(
                    'POST', f'goods-requests/{self.test_request_id}/receipts/confirm-requester',
                    data={"receipt_id": receipt_id},
                    token=self.test_users["test_requester"]["token"]
                )
                
                if success:
                    self.log_test("Workflow - Confirm Receipt (Requester)", True)
                else:
                    self.log_test("Workflow - Confirm Receipt (Requester)", False, f"Response: {response}")

        else:
            self.log_test("Workflow - Add Receipt", False, f"Response: {response}")

        # Step 9: Upload invoice as procurement
        invoice_data = {
            "invoice_base64": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k="
        }

        success, response = self.make_request(
            'POST', f'goods-requests/{self.test_request_id}/invoice',
            data=invoice_data,
            token=self.test_users["test_procurement"]["token"]
        )
        
        if success:
            self.log_test("Workflow - Upload Invoice", True)
        else:
            self.log_test("Workflow - Upload Invoice", False, f"Response: {response}")

        # Step 10: Final approval by financial
        if not self.test_users.get("test_financial"):
            self.log_test("Workflow - Final Approval", False, "No test financial user")
            return False

        success, response = self.make_request(
            'POST', f'goods-requests/{self.test_request_id}/approve-financial',
            data={"notes": "تایید نهایی انجام شد"},
            token=self.test_users["test_financial"]["token"]
        )
        
        if success:
            self.log_test("Workflow - Final Approval", True)
        else:
            self.log_test("Workflow - Final Approval", False, f"Response: {response}")

        return True

    def test_notifications(self):
        """Test notifications system"""
        print("\n🔔 Testing Notifications...")
        
        # Test getting notifications for different users
        for username, user_info in self.test_users.items():
            success, response = self.make_request(
                'GET', 'notifications',
                token=user_info["token"]
            )
            
            if success and isinstance(response, list):
                self.log_test(f"Get Notifications - {username}", True)
            else:
                self.log_test(f"Get Notifications - {username}", False, f"Response: {response}")

    def test_reports(self):
        """Test reports and Excel export"""
        print("\n📊 Testing Reports...")
        
        # Test Excel export for admin
        try:
            url = f"{self.base_url}/reports/excel"
            headers = {'Authorization': f'Bearer {self.admin_token}'}
            response = requests.get(url, headers=headers, timeout=30)
            
            if response.status_code == 200 and 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' in response.headers.get('content-type', ''):
                self.log_test("Excel Export", True)
            else:
                self.log_test("Excel Export", False, f"Status: {response.status_code}, Content-Type: {response.headers.get('content-type')}")
        except Exception as e:
            self.log_test("Excel Export", False, f"Exception: {str(e)}")

    def test_role_based_access(self):
        """Test role-based access control"""
        print("\n🔒 Testing Role-Based Access Control...")
        
        # Test that requester cannot access admin endpoints
        if self.test_users.get("test_requester"):
            success, response = self.make_request(
                'GET', 'users',
                token=self.test_users["test_requester"]["token"],
                expected_status=403
            )
            
            if success:  # Should fail with 403
                self.log_test("RBAC - Requester Cannot Access Users", True)
            else:
                self.log_test("RBAC - Requester Cannot Access Users", False, "Requester should not access users endpoint")

        # Test that procurement can add inquiries but management cannot
        if self.test_request_id and self.test_users.get("test_management"):
            success, response = self.make_request(
                'POST', f'goods-requests/{self.test_request_id}/inquiries',
                data=[{"unit_price": 1000, "quantity": 1, "total_price": 1000}],
                token=self.test_users["test_management"]["token"],
                expected_status=403
            )
            
            if success:  # Should fail with 403
                self.log_test("RBAC - Management Cannot Add Inquiries", True)
            else:
                self.log_test("RBAC - Management Cannot Add Inquiries", False, "Management should not add inquiries")

    def run_all_tests(self):
        """Run comprehensive test suite"""
        print("🚀 Starting Persian Organizational Portal API Tests")
        print("=" * 60)
        
        # Test sequence
        if not self.test_admin_login():
            print("❌ Cannot proceed without admin login")
            return False

        self.test_user_management()
        self.test_cost_centers()
        self.test_goods_request_workflow()
        self.test_notifications()
        self.test_reports()
        self.test_role_based_access()

        # Print summary
        print("\n" + "=" * 60)
        print(f"📊 Test Summary:")
        print(f"   Total Tests: {self.tests_run}")
        print(f"   Passed: {self.tests_passed}")
        print(f"   Failed: {len(self.failed_tests)}")
        print(f"   Success Rate: {(self.tests_passed/self.tests_run*100):.1f}%")

        if self.failed_tests:
            print(f"\n❌ Failed Tests:")
            for test in self.failed_tests:
                print(f"   - {test['name']}: {test['details']}")

        return len(self.failed_tests) == 0

def main():
    """Main test execution"""
    tester = PersianPortalAPITester()
    success = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())