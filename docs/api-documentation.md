# ThrivioHR API Documentation

## Overview
ThrivioHR provides a comprehensive REST API for Human Resources Management System (HRMS) integration. This API allows external systems to seamlessly integrate with ThrivioHR for employee management, organizational structure, and HR operations.

## Authentication
All API requests require authentication using JWT tokens.

### Headers
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

## Base URL
```
https://your-thrivio-instance.com/api
```

## Employee Management APIs

### 1. Get All Employees
**GET** `/api/users`

Returns a list of all employees in the organization.

**Response:**
```json
[
  {
    "id": 1,
    "name": "John",
    "surname": "Doe", 
    "email": "john.doe@company.com",
    "job_title": "Software Engineer",
    "department": "Engineering",
    "location": "New York Office",
    "phone_number": "+1-555-0123",
    "manager_email": "manager@company.com",
    "hire_date": "2024-01-15",
    "birth_date": "1990-05-20",
    "nationality": "American",
    "sex": "Male",
    "status": "active",
    "is_admin": false,
    "created_at": "2024-01-15T10:00:00Z"
  }
]
```

### 2. Create Employee
**POST** `/api/admin/employees`

Creates a new employee in the system.

**Request Body:**
```json
{
  "name": "Jane",
  "surname": "Smith",
  "email": "jane.smith@company.com",
  "job_title": "Marketing Manager",
  "department": "Marketing",
  "location": "London Office",
  "phone_number": "+44-20-7946-0958",
  "manager_email": "director@company.com",
  "hire_date": "2024-02-01",
  "birth_date": "1988-12-03",
  "nationality": "British",
  "sex": "Female"
}
```

**Response:**
```json
{
  "id": 2,
  "message": "Employee created successfully",
  "employee": {
    "id": 2,
    "name": "Jane",
    "surname": "Smith",
    "email": "jane.smith@company.com",
    "username": "jane_smith_company",
    "status": "active"
  }
}
```

### 3. Update Employee
**PUT** `/api/admin/employees/{id}`

Updates an existing employee's information.

**Request Body:** (Same as Create Employee)

**Response:**
```json
{
  "message": "Employee updated successfully",
  "employee": {
    "id": 2,
    "name": "Jane",
    "surname": "Smith Updated",
    "email": "jane.smith@company.com"
  }
}
```

### 4. Delete Employee
**DELETE** `/api/admin/employees/{id}`

Deactivates an employee (soft delete).

**Response:**
```json
{
  "message": "Employee deleted successfully"
}
```

### 5. Bulk Employee Upload
**POST** `/api/admin/employees/bulk-upload`

Upload multiple employees via CSV file.

**Request:** 
- Content-Type: `multipart/form-data`
- Body: CSV file with employee data

**CSV Format:**
```csv
name,surname,email,department,job_title,location,phone_number,manager_email,hire_date,birth_date,nationality,sex
John,Doe,john.doe@company.com,Engineering,Software Engineer,New York Office,+1-555-0123,manager@company.com,2024-01-15,1990-05-20,American,Male
```

**Response:**
```json
{
  "success": true,
  "totalRows": 10,
  "successCount": 8,
  "errorCount": 2,
  "errors": [
    {
      "row": 5,
      "field": "email",
      "message": "Email already exists",
      "email": "duplicate@company.com"
    }
  ],
  "createdUsers": [
    {
      "name": "John Doe",
      "email": "john.doe@company.com", 
      "department": "Engineering"
    }
  ]
}
```

### 6. Preview Bulk Upload
**POST** `/api/admin/employees/preview`

Preview CSV data before uploading.

**Request:** Same as bulk upload
**Response:** Preview of data without creating records

## Department Management APIs

### 1. Get Departments
**GET** `/api/admin/departments`

Returns all departments for the organization.

**Response:**
```json
[
  {
    "id": 1,
    "name": "Engineering",
    "color": "#3B82F6",
    "is_active": true,
    "employee_count": 15,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### 2. Create Department
**POST** `/api/admin/departments`

**Request Body:**
```json
{
  "name": "Data Science",
  "color": "#8B5CF6"
}
```

### 3. Update Department
**PUT** `/api/admin/departments/{id}`

### 4. Delete Department
**DELETE** `/api/admin/departments/{id}`

## Location Management APIs

### 1. Get Locations
**GET** `/api/admin/locations`

**Response:**
```json
[
  {
    "id": 1,
    "name": "New York Office",
    "address": "123 Main St, New York, NY 10001",
    "timezone": "America/New_York",
    "is_active": true,
    "employee_count": 25,
    "created_at": "2024-01-01T00:00:00Z"
  }
]
```

### 2. Create Location
**POST** `/api/admin/locations`

**Request Body:**
```json
{
  "name": "San Francisco Office",
  "address": "456 Tech St, San Francisco, CA 94105",
  "timezone": "America/Los_Angeles"
}
```

### 3. Update Location
**PUT** `/api/admin/locations/{id}`

### 4. Delete Location
**DELETE** `/api/admin/locations/{id}`

## Data Filters and Queries

### Employee Filtering
**GET** `/api/users?department=Engineering&location=New York Office&status=active`

**Query Parameters:**
- `department`: Filter by department name
- `location`: Filter by location name  
- `status`: Filter by status (active, inactive)
- `search`: Search by name, email, or job title
- `limit`: Number of results (default: 50)
- `offset`: Pagination offset (default: 0)

### Analytics and Reports
**GET** `/api/admin/subscription/usage`

Returns organization statistics and subscription usage.

**Response:**
```json
{
  "subscribed_users": 150,
  "current_usage": 85,
  "active_employees": 82,
  "total_employees": 85,
  "capacity_percentage": 57
}
```

## Error Handling

### Error Response Format
```json
{
  "message": "Error description",
  "code": "ERROR_CODE",
  "details": {
    "field": "Field with error",
    "value": "Invalid value"
  }
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `409` - Conflict (duplicate data)
- `422` - Unprocessable Entity (validation failed)
- `500` - Internal Server Error

## Rate Limiting
- 1000 requests per hour per organization
- Bulk operations limited to 500 records per request
- File uploads limited to 10MB

## Webhooks (Optional)
Configure webhooks to receive real-time notifications:

### Employee Events
- `employee.created`
- `employee.updated` 
- `employee.deleted`
- `employee.status_changed`

### Department Events
- `department.created`
- `department.updated`
- `department.deleted`

### Webhook Payload Example
```json
{
  "event": "employee.created",
  "timestamp": "2024-01-15T10:00:00Z",
  "organization_id": 123,
  "data": {
    "employee": {
      "id": 456,
      "name": "John Doe",
      "email": "john.doe@company.com",
      "department": "Engineering"
    }
  }
}
```

## SDK and Integration Examples

### JavaScript/Node.js
```javascript
const ThrivioAPI = require('@thrivio/api-client');

const client = new ThrivioAPI({
  baseURL: 'https://your-instance.thrivio.com/api',
  token: 'your-jwt-token'
});

// Create employee
const employee = await client.employees.create({
  name: 'John',
  surname: 'Doe',
  email: 'john.doe@company.com',
  department: 'Engineering'
});

// Get all employees
const employees = await client.employees.list({
  department: 'Engineering',
  status: 'active'
});
```

### Python
```python
import requests
import json

class ThrivioAPI:
    def __init__(self, base_url, token):
        self.base_url = base_url
        self.headers = {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def create_employee(self, employee_data):
        response = requests.post(
            f'{self.base_url}/admin/employees',
            headers=self.headers,
            json=employee_data
        )
        return response.json()
    
    def get_employees(self, filters=None):
        response = requests.get(
            f'{self.base_url}/users',
            headers=self.headers,
            params=filters
        )
        return response.json()

# Usage
api = ThrivioAPI('https://your-instance.thrivio.com/api', 'your-jwt-token')
employees = api.get_employees({'department': 'Engineering'})
```

## Support and Contact
- Documentation: https://docs.thrivio.com
- Support: support@thrivio.com
- Developer Portal: https://developers.thrivio.com

---

*Last updated: January 2024*
*API Version: 1.0*