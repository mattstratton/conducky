# Requirements

This is a web application that will be used to manage Code of Conduct reports for conferences. It needs to be able to be deployed on a single server, ideally. We want to optimize for the easiest deployement process for someone to set it up. We will also likely offer a hosted version for conferences to use, so we need to keep that in mind.

## Tech Stack

- React
- Node.js
- Database (could be mysql, postgres, etc.)

## Features

- [ ] User authentication
- [ ] Report submission
- [ ] Report management
- [ ] Multi-tenancy (for conferences)

Users need to be able to submit reports anonymously, or with an account/login with contact information, etc.

For each event, there also needs to be different user roles, like admins, organizers, etc.

We need to be able to add new events to the system, and have them be able to report incidents.

When a report is submitted, it should be able to be handled by the admins of the event, and then responded to. There are likely different types of reports, like harassment, discrimination, etc. Reports need to be able to be responded to by the admins, and then the user should be notified of the response. There should also be a way to report back to the user about the report, and the outcome of it. Additionally, reports will be in different states, like pending, resolved, etc.
