CREATE TABLE "document_counters" (
	"prefix" text NOT NULL,
	"year" integer NOT NULL,
	"last" integer NOT NULL,
	CONSTRAINT "document_counters_prefix_year_pk" PRIMARY KEY("prefix","year")
);
--> statement-breakpoint
-- Nạp bộ đếm từ mã đã có (dự án nâng từ 1.3.x có phiếu mã PR-YYYY-NNNNNN): số mới tiếp nối, không trùng mã cũ.
INSERT INTO "document_counters" ("prefix", "year", "last")
SELECT 'PR', split_part("code", '-', 2)::int, max(split_part("code", '-', 3)::int)
FROM "purchase_requests" WHERE "code" ~ '^PR-[0-9]{4}-[0-9]+$'
GROUP BY 2
ON CONFLICT DO NOTHING;
--> statement-breakpoint
DROP SEQUENCE "public"."pr_code_seq";