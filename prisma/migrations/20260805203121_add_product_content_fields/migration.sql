-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "benefitsPl" JSONB,
ADD COLUMN     "certifications" JSONB,
ADD COLUMN     "contraindicationsPl" TEXT,
ADD COLUMN     "descriptionUk" TEXT,
ADD COLUMN     "responsibleEntity" TEXT,
ADD COLUMN     "shortDescUk" TEXT,
ADD COLUMN     "usageInstructionsPl" TEXT;

