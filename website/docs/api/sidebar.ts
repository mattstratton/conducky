import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api/conducky-api",
    },
    {
      type: "category",
      label: "Logs",
      items: [
        {
          type: "doc",
          id: "api/receive-frontend-logs",
          label: "Receive frontend logs",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Organizations",
      items: [
        {
          type: "doc",
          id: "api/get-organization-invite-details",
          label: "Get organization invite details",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-a-new-organization",
          label: "Create a new organization",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/list-all-organizations",
          label: "List all organizations",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-users-organizations",
          label: "Get user's organizations",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-organization-by-slug",
          label: "Get organization by slug",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-organization-incident-analytics",
          label: "Get organization incident analytics",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-organization-incident-analytics-by-slug",
          label: "Get organization incident analytics by slug",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-organization-events-summary",
          label: "Get organization events summary",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/export-organization-incidents",
          label: "Export organization incidents",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-organization-by-id",
          label: "Get organization by ID",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/update-organization",
          label: "Update organization",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/delete-organization",
          label: "Delete organization",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/add-member-to-organization",
          label: "Add member to organization",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/update-member-role",
          label: "Update member role",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/remove-member-from-organization",
          label: "Remove member from organization",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/create-event-in-organization",
          label: "Create event in organization",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/list-organization-events",
          label: "List organization events",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-organization-invite-link",
          label: "Create organization invite link",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-organization-invite-links",
          label: "Get organization invite links",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/update-organization-invite-link",
          label: "Update organization invite link",
          className: "api-method patch",
        },
        {
          type: "doc",
          id: "api/use-organization-invite-link",
          label: "Use organization invite link",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Tags",
      items: [
        {
          type: "doc",
          id: "api/get-all-tags-for-an-event",
          label: "Get all tags for an event",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/get-all-tags-for-an-event-by-slug",
          label: "Get all tags for an event by slug",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-a-new-tag",
          label: "Create a new tag",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/update-a-tag",
          label: "Update a tag",
          className: "api-method put",
        },
        {
          type: "doc",
          id: "api/delete-a-tag",
          label: "Delete a tag",
          className: "api-method delete",
        },
        {
          type: "doc",
          id: "api/add-tags-to-an-incident",
          label: "Add tags to an incident",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/remove-tags-from-an-incident",
          label: "Remove tags from an incident",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/get-all-incidents-with-a-specific-tag",
          label: "Get all incidents with a specific tag",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Schemas",
      items: [
        {
          type: "doc",
          id: "api/schemas/user",
          label: "User",
          className: "schema",
        },
        {
          type: "doc",
          id: "api/schemas/event",
          label: "Event",
          className: "schema",
        },
        {
          type: "doc",
          id: "api/schemas/report",
          label: "Report",
          className: "schema",
        },
        {
          type: "doc",
          id: "api/schemas/organization",
          label: "Organization",
          className: "schema",
        },
        {
          type: "doc",
          id: "api/schemas/error",
          label: "Error",
          className: "schema",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
