import type { Metadata } from "next";
import Link from "next/link";
import { getShopSettings } from "@/features/settings/lib/shop-settings";
import { formatPriceCompact } from "@/lib/format";
import { PICKUP_HOLD_DAYS } from "@/lib/pickup-locations";
import { buildFaqJsonLd, toJsonLdScript } from "@/lib/seo";

export const dynamic = "force-static";

export const metadata: Metadata = {
  title: "Najczęściej zadawane pytania (FAQ)",
  alternates: { canonical: "/faq" },
  description:
    "Odpowiedzi na pytania o zamówienia, dostawę, płatności, zwroty, fakturę oraz bezpieczne stosowanie suplementów diety w Well Botany.",
};

type Faq = { q: string; a: string };

function buildGroups(freeShipping: string | null): { title: string; items: Faq[] }[] {
  return [
    {
      title: "Zamówienia",
      items: [
        {
          q: "Jak złożyć zamówienie?",
          a: "Dodaj produkty do koszyka, kliknij „Przejdź do kasy”, podaj dane kontaktowe, wybierz metodę dostawy i płatności. Po złożeniu zamówienia otrzymasz e-mail z potwierdzeniem.",
        },
        {
          q: "Czy muszę mieć konto, żeby złożyć zamówienie?",
          a: "Nie. Możesz kupować jako gość, podając adres e-mail i dane dostawy. Konto daje dostęp do historii zamówień i listy ulubionych produktów.",
        },
        {
          q: "Jak sprawdzić status zamówienia?",
          a: "Każdą zmianę statusu (opłacone, w realizacji, wysłane) wysyłamy e-mailem. Zalogowani klienci widzą status także w sekcji Moje konto → Zamówienia.",
        },
        {
          q: "Czy mogę zmienić lub anulować zamówienie?",
          a: "Jeśli zamówienie nie zostało jeszcze wysłane, napisz jak najszybciej na kontakt@wellbotany.pl z numerem zamówienia – postaramy się je zmienić lub anulować.",
        },
        {
          q: "Jak skorzystać z kodu rabatowego?",
          a: "Wpisz kod w polu „Kod rabatowy” podczas składania zamówienia. Rabat zobaczysz w podsumowaniu zamówienia. Do jednego zamówienia można użyć jednego kodu.",
        },
        {
          q: "Czy mogę otrzymać fakturę VAT?",
          a: "Tak. W formularzu zamówienia zaznacz „Chcę fakturę” i podaj NIP oraz nazwę firmy. Fakturę prześlemy e-mailem.",
        },
      ],
    },
    {
      title: "Dostawa",
      items: [
        {
          q: "Ile trwa realizacja i dostawa?",
          a: "Zamówienia wysyłamy w ciągu 2 dni roboczych od zaksięgowania płatności. Doręczenie przez przewoźnika trwa zwykle 1–2 dni robocze. Po nadaniu paczki otrzymasz e-mail z numerem przesyłki.",
        },
        {
          q: "Jakie są metody i koszty dostawy?",
          a: `Dostępne metody (paczkomat, punkt odbioru, kurier) i ich ceny widzisz w koszyku oraz na stronie Dostawa i płatność.${freeShipping ? ` Przy zamówieniu od ${freeShipping} dostawa jest bezpłatna.` : ""}`,
        },
        {
          q: "Czy wysyłacie za granicę?",
          a: "Obecnie realizujemy dostawy wyłącznie na terenie Polski.",
        },
        {
          q: "Jak działa odbiór osobisty?",
          a: `Wybierz odbiór osobisty w koszyku. Gdy zamówienie będzie gotowe, wyślemy e-mail – paczka czeka na odbiór ${PICKUP_HOLD_DAYS} dni. Adresy i godziny punktów znajdziesz na stronie Dostawa i płatność.`,
        },
        {
          q: "Paczka dotarła uszkodzona – co zrobić?",
          a: "Jeśli to możliwe, sporządź z kurierem protokół szkody lub zrób zdjęcia opakowania i zawartości. Następnie napisz do nas z numerem zamówienia – zajmiemy się reklamacją.",
        },
      ],
    },
    {
      title: "Płatności",
      items: [
        {
          q: "Jakie są formy płatności?",
          a: "Online przez Przelewy24: BLIK, karty płatnicze (Visa, Mastercard), Apple Pay, Google Pay i szybkie przelewy. Możesz też zapłacić tradycyjnym przelewem, a przy odbiorze osobistym – na miejscu.",
        },
        {
          q: "Czy płatności online są bezpieczne?",
          a: "Tak. Płatności obsługuje licencjonowany operator Przelewy24 (PayPro S.A.). Nie przechowujemy danych Twojej karty.",
        },
        {
          q: "Ile mam czasu na opłacenie zamówienia przelewem tradycyjnym?",
          a: "Prosimy o wpłatę w ciągu 3 dni roboczych. Dane do przelewu otrzymasz po złożeniu zamówienia i w e-mailu. Zamówienie realizujemy po zaksięgowaniu wpłaty.",
        },
        {
          q: "Płatność się nie powiodła – co teraz?",
          a: "Zamówienie zostaje zapisane. Napisz do nas z numerem zamówienia – pomożemy dokończyć płatność lub zmienić ją na przelew tradycyjny.",
        },
      ],
    },
    {
      title: "Zwroty i reklamacje",
      items: [
        {
          q: "Czy mogę zwrócić produkt?",
          a: "Tak – masz 14 dni od otrzymania paczki na odstąpienie od umowy bez podania przyczyny. Wyjątkiem są produkty w zapieczętowanym opakowaniu, które po otwarciu nie nadają się do zwrotu ze względów higienicznych lub zdrowotnych (np. suplementy, kosmetyki).",
        },
        {
          q: "Jak zwrócić zamówienie?",
          a: "Napisz na kontakt@wellbotany.pl z numerem zamówienia i listą zwracanych produktów. W odpowiedzi podamy adres zwrotny. Koszt odesłania ponosi kupujący, chyba że towar jest wadliwy.",
        },
        {
          q: "Kiedy otrzymam zwrot pieniędzy?",
          a: "Do 14 dni od otrzymania oświadczenia o odstąpieniu, tą samą metodą płatności. Możemy wstrzymać zwrot do chwili otrzymania towaru lub dowodu jego odesłania.",
        },
        {
          q: "Jak złożyć reklamację?",
          a: "Wyślij e-mail z numerem zamówienia, opisem wady i zdjęciami. Reklamację rozpatrzymy w ciągu 14 dni. Szczegóły znajdziesz na stronie Zwroty i reklamacje.",
        },
      ],
    },
    {
      title: "Produkty",
      items: [
        {
          q: "Gdzie znajdę skład i dawkowanie produktu?",
          a: "Na stronie każdego produktu: tabela składników z ilością w porcji dziennej i %RWS, pełna lista składników, sposób użycia i ostrzeżenia. Nazwy składników w tabeli prowadzą do słownika Składniki A–Z.",
        },
        {
          q: "Jak sprawdzić datę ważności?",
          a: "Data minimalnej trwałości jest podana na opakowaniu. Jeśli potrzebujesz produktu z konkretną datą (np. przy większym zamówieniu), zapytaj nas przed zakupem.",
        },
        {
          q: "Jak rozpoznać produkty wegańskie?",
          a: "Skorzystaj z kategorii Suplementy wegańskie. W składzie zwróć uwagę na otoczkę kapsułki – HPMC (celuloza) lub pullulan zamiast żelatyny.",
        },
        {
          q: "Czy mogę wystawić opinię o produkcie?",
          a: "Tak. Po doręczeniu zamówienia wyślemy e-mail z linkiem do formularza opinii. Publikujemy wyłącznie opinie zweryfikowanych kupujących – zarówno pozytywne, jak i negatywne.",
        },
      ],
    },
    {
      title: "Suplementy diety – bezpieczeństwo",
      items: [
        {
          q: "Czy suplementy w sklepie są legalne i bezpieczne?",
          a: "Suplementy diety w naszej ofercie są zgłoszone do Głównego Inspektoratu Sanitarnego. Zgłoszenie nie jest badaniem skuteczności – dlatego przy każdym produkcie podajemy pełny skład i dawki, by można było świadomie wybierać.",
        },
        {
          q: "Czy suplement zastąpi zdrową dietę?",
          a: "Nie. Suplement diety uzupełnia dietę i nie może być stosowany jako substytut zróżnicowanej diety oraz zdrowego trybu życia.",
        },
        {
          q: "Czy mogę łączyć suplementy z lekami?",
          a: "Niektóre składniki (np. magnez, wapń, żelazo, witamina K, dziurawiec, żeń-szeń) mogą wpływać na działanie leków. Jeśli przyjmujesz leki na stałe, zapytaj lekarza lub farmaceutę przed rozpoczęciem suplementacji.",
        },
        {
          q: "Czy suplementy są dla kobiet w ciąży i dzieci?",
          a: "Tylko te, które producent przeznaczył dla tych grup – sprawdź ostrzeżenia na etykiecie. W ciąży i przy suplementacji dzieci skonsultuj wybór z lekarzem.",
        },
        {
          q: "Co zrobić, gdy wystąpi reakcja niepożądana?",
          a: "Przerwij stosowanie i skontaktuj się z lekarzem. Daj nam też znać, podając nazwę produktu i numer partii z opakowania.",
        },
        {
          q: "Czy doradzacie w doborze suplementów?",
          a: "Odpowiemy na pytania o skład, formę i dawki produktów. Nie udzielamy porad medycznych – w sprawach zdrowia skonsultuj się z lekarzem lub farmaceutą. Praktyczne informacje znajdziesz też w naszym Poradniku.",
        },
      ],
    },
  ];
}

export default async function FaqPage() {
  const { freeShippingThresholdPln } = await getShopSettings();
  const groups = buildGroups(
    freeShippingThresholdPln !== null ? formatPriceCompact(freeShippingThresholdPln) : null,
  );
  const jsonLd = buildFaqJsonLd(groups.flatMap((group) => group.items));

  return (
    <div className="container mx-auto max-w-prose px-4 py-12">
      <script
        type="application/ld+json"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: sanitized by toJsonLdScript
        dangerouslySetInnerHTML={{ __html: toJsonLdScript(jsonLd) }}
      />
      <h1 className="mb-4 text-3xl">Najczęściej zadawane pytania</h1>
      <nav aria-label="Tematy" className="mb-10 flex flex-wrap gap-2">
        {groups.map((group, i) => (
          <a
            key={group.title}
            href={`#temat-${i + 1}`}
            className="rounded-full bg-secondary px-3 py-1.5 text-sm font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
          >
            {group.title}
          </a>
        ))}
      </nav>

      <div className="space-y-10">
        {groups.map((group, i) => (
          <section key={group.title} id={`temat-${i + 1}`} className="scroll-mt-24">
            <h2 className="mb-4 text-xl">{group.title}</h2>
            <div className="space-y-3">
              {group.items.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-2xl bg-card shadow-card open:shadow-card-hover"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-5 py-4 text-sm font-semibold marker:content-none">
                    {faq.q}
                    <span className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <p className="px-5 pb-5 text-sm text-muted-foreground">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-10 text-sm text-muted-foreground">
        Więcej informacji:{" "}
        <Link href="/dostawa" className="text-primary hover:underline">
          Dostawa i płatność
        </Link>
        ,{" "}
        <Link href="/zwroty" className="text-primary hover:underline">
          Zwroty i reklamacje
        </Link>
        ,{" "}
        <Link href="/poradnik" className="text-primary hover:underline">
          Poradnik
        </Link>
        .
      </p>

      <div className="mt-12 rounded-2xl bg-secondary p-6 text-center">
        <p className="text-sm font-semibold">Nie znalazłeś odpowiedzi?</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Napisz do nas — odpowiemy w ciągu jednego dnia roboczego.
        </p>
        <Link
          href="/kontakt"
          className="mt-4 inline-block rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-deep motion-reduce:transition-none"
        >
          Napisz do nas
        </Link>
      </div>
    </div>
  );
}
