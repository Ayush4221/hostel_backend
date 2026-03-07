-- CreateTable
CREATE TABLE "announcement_read" (
    "user_id" UUID NOT NULL,
    "announcement_id" INTEGER NOT NULL,
    "read_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "announcement_read_pkey" PRIMARY KEY ("user_id","announcement_id")
);

-- CreateIndex
CREATE INDEX "announcement_read_user_id_idx" ON "announcement_read"("user_id");

-- AddForeignKey
ALTER TABLE "announcement_read" ADD CONSTRAINT "announcement_read_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcement_read" ADD CONSTRAINT "announcement_read_announcement_id_fkey" FOREIGN KEY ("announcement_id") REFERENCES "announcements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
