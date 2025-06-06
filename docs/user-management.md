## Event Admin User List Features

Event Admins can manage users for their event using a powerful user list UI with the following features:

- **Search:** Filter users by name or email using the search box above the table. The list updates as you type.
- **Sort:** Sort users by name, email, or role using the sort dropdown. Toggle ascending/descending order with the arrow button.
- **Pagination:** Navigate through users with page controls below the table. Change the number of users per page (10, 20, 50) using the selector.
- **Role Filter:** Filter users by event role (Admin, Responder, Reporter) using the role dropdown. Only users with the selected role will be shown.

All these controls can be combined for advanced filtering and navigation.

### API Details
The backend endpoint `/events/slug/:slug/users` supports the following query parameters:
- `search` (string): Filter by name or email
- `sort` (name|email|role): Sort field
- `order` (asc|desc): Sort order
- `page` (integer): Page number
- `limit` (integer): Users per page
- `role` (Admin|Responder|Reporter): Filter by event role

See [API Endpoints](./api-endpoints.md) for more details. 