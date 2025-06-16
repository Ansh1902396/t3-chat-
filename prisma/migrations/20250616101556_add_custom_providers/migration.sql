-- CreateTable
CREATE TABLE "CustomProvider" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "baseUrl" TEXT,
    "apiKey" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB,

    CONSTRAINT "CustomProvider_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CustomProvider_userId_idx" ON "CustomProvider"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomProvider_userId_name_key" ON "CustomProvider"("userId", "name");

-- AddForeignKey
ALTER TABLE "CustomProvider" ADD CONSTRAINT "CustomProvider_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
