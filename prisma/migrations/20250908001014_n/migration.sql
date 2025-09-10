/*
  Warnings:

  - You are about to drop the column `pixKeyVerified` on the `User` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT,
    "phoneE164" TEXT,
    "passwordHash" TEXT NOT NULL,
    "emailVerifiedAt" DATETIME,
    "phoneVerifiedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_User" ("createdAt", "email", "emailVerifiedAt", "id", "passwordHash", "phoneE164", "phoneVerifiedAt", "updatedAt") SELECT "createdAt", "email", "emailVerifiedAt", "id", "passwordHash", "phoneE164", "phoneVerifiedAt", "updatedAt" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_phoneE164_key" ON "User"("phoneE164");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
