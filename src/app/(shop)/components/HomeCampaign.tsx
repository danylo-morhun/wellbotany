import type { ProductListItem } from "@/features/catalog/actions";
import { ProductCard } from "@/features/catalog/components/ProductCard";
import { CampaignWindow } from "@/features/home/components/CampaignWindow";
import type { Campaign } from "@/features/home/lib/campaign";
import { SectionHeading } from "./SectionHeading";

// Two rows on phones; the rest is one tap away
const MOBILE_LIMIT = 4;

type Props = { campaign: Campaign; products: ProductListItem[] };

/** Dated sale section (Black Week…): the real reductions, biggest first. Every
 * card carries its own Omnibus note; the heading states the real end date. */
export function HomeCampaign({ campaign, products }: Props) {
  if (products.length === 0) return null;
  const headingId = `${campaign.id}-h`;

  return (
    <CampaignWindow
      startsAt={campaign.startsAt.toISOString()}
      endsAt={campaign.endsAt.toISOString()}
    >
      <section aria-labelledby={headingId} className="space-y-4">
        <div>
          <SectionHeading
            id={headingId}
            title={campaign.title}
            link={{ href: "/katalog?promocje=1", label: "Zobacz wszystkie" }}
          />
          <p className="mt-1 text-sm text-muted-foreground">{campaign.note}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4 lg:gap-5">
          {products.map((p, i) => (
            // `contents` keeps each card a grid item, so a row stretches to one height
            <div key={p.id} className={i >= MOBILE_LIMIT ? "contents max-md:hidden" : "contents"}>
              <ProductCard product={p} headingLevel={3} />
            </div>
          ))}
        </div>
      </section>
    </CampaignWindow>
  );
}
