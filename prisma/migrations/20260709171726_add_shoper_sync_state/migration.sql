-- CreateTable
CREATE TABLE "ShoperSyncState" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "cursorPage" INTEGER NOT NULL DEFAULT 0,
    "lastRunAt" TIMESTAMP(3),
    "lastSuccessAt" TIMESTAMP(3),
    "lastError" TEXT,

    CONSTRAINT "ShoperSyncState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ShoperSyncState_kind_key" ON "ShoperSyncState"("kind");
