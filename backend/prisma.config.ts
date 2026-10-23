import "dotenv/config";
import { defineConfig } from "prisma/config";

// Prisma 7 reads the connection URL from here, not from schema.prisma.
// Not env(): that throws at load time, and `prisma generate` (CI, image
// builds) runs without a database. `migrate` still fails on an empty URL.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env.DATABASE_URL ?? "",
  },
});
