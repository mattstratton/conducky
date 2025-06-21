import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "api/api-index",
    },
    {
      type: "doc",
      id: "api/conducky-api",
    },
    {
      type: "category",
      label: "Authentication",
      items: [
        {
          type: "doc",
          id: "api/user-login",
          label: "User login",
          className: "api-method post",
        },
        {
          type: "doc",
          id: "api/user-logout",
          label: "User logout",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Events",
      items: [
        {
          type: "doc",
          id: "api/get-all-events",
          label: "Get all events",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-a-new-event",
          label: "Create a new event",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Reports",
      items: [
        {
          type: "doc",
          id: "api/get-reports",
          label: "Get reports",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "api/create-a-new-report",
          label: "Create a new report",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Users",
      items: [
        {
          type: "doc",
          id: "api/get-users",
          label: "Get users",
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
          id: "api/schemas/error",
          label: "Error",
          className: "schema",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar; 