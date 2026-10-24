import { SELLER } from "@/lib/seller";

const SITE = "https://wellbotany.pl";
const H2 = 'style="font-size:16px;margin-top:24px"';
const SMALL = 'style="font-size:13px;color:#444"';

/**
 * Contract information that must reach the buyer on a durable medium with the
 * order confirmation (UPK art. 21 ust. 1 → art. 12 ust. 1). The withdrawal
 * notice follows the statutory template (zał. 1, so art. 13 covers pkt 9–11)
 * and the form follows zał. 2. A link to the site isn't a durable medium.
 */
export function contractInfoHtml(): string {
  return `
    <h2 ${H2}>Sprzedawca</h2>
    <p ${SMALL}>${SELLER.legalName}<br>${SELLER.registry}<br>${SELLER.address}<br>
    e-mail: ${SELLER.email}, tel. ${SELLER.phone}</p>

    <h2 ${H2}>Płatność i dostawa</h2>
    <p ${SMALL}>Ceny zawierają podatek VAT. Przy płatności z góry prosimy o wpłatę w ciągu 3 dni roboczych od złożenia zamówienia. Zamówienie wysyłamy w ciągu 2 dni roboczych od zaksięgowania płatności; przewoźnik doręcza je zwykle w 1–2 dni robocze od nadania. Dostawa wyłącznie na terenie Polski.</p>

    <h2 ${H2}>Prawo odstąpienia od umowy</h2>
    <div ${SMALL}>
    <p>Mają Państwo prawo odstąpić od niniejszej umowy w terminie 14 dni bez podania jakiejkolwiek przyczyny.</p>
    <p>Termin do odstąpienia od umowy wygasa po upływie 14 dni od dnia, w którym weszli Państwo w posiadanie towaru lub w którym osoba trzecia inna niż przewoźnik i wskazana przez Państwa weszła w posiadanie towaru.</p>
    <p>Aby skorzystać z prawa odstąpienia od umowy, muszą Państwo poinformować nas (${SELLER.legalName}, ${SELLER.address}, tel. ${SELLER.phone}, e-mail: ${SELLER.email}) o swojej decyzji o odstąpieniu od niniejszej umowy w drodze jednoznacznego oświadczenia (na przykład pismo wysłane pocztą lub pocztą elektroniczną). Mogą Państwo skorzystać z wzoru formularza odstąpienia od umowy, jednak nie jest to obowiązkowe.</p>
    <p>Aby zachować termin do odstąpienia od umowy, wystarczy, aby wysłali Państwo informację dotyczącą wykonania przysługującego Państwu prawa odstąpienia od umowy przed upływem terminu do odstąpienia od umowy.</p>
    <p><strong>Skutki odstąpienia od umowy</strong></p>
    <p>W przypadku odstąpienia od niniejszej umowy zwracamy Państwu wszystkie otrzymane od Państwa płatności, w tym koszty dostarczenia towaru (z wyjątkiem dodatkowych kosztów wynikających z wybranego przez Państwa sposobu dostarczenia innego niż najtańszy zwykły sposób dostarczenia oferowany przez nas), niezwłocznie, a w każdym przypadku nie później niż 14 dni od dnia, w którym zostaliśmy poinformowani o Państwa decyzji o wykonaniu prawa odstąpienia od niniejszej umowy. Zwrotu płatności dokonamy przy użyciu takich samych sposobów płatności, jakie zostały przez Państwa użyte w pierwotnej transakcji, chyba że wyraźnie zgodziliście się Państwo na inne rozwiązanie; w każdym przypadku nie poniosą Państwo żadnych opłat w związku z tym zwrotem. Możemy wstrzymać się ze zwrotem płatności do czasu otrzymania towaru lub do czasu dostarczenia nam dowodu jego odesłania, w zależności od tego, które zdarzenie nastąpi wcześniej.</p>
    <p>Proszę odesłać lub przekazać nam towar na adres ${SELLER.address} niezwłocznie, a w każdym razie nie później niż 14 dni od dnia, w którym poinformowali nas Państwo o odstąpieniu od niniejszej umowy. Termin jest zachowany, jeżeli odeślą Państwo towar przed upływem terminu 14 dni.</p>
    <p>Będą Państwo musieli ponieść bezpośrednie koszty zwrotu towarów.</p>
    <p>Odpowiadają Państwo tylko za zmniejszenie wartości towaru wynikające z korzystania z niego w sposób inny niż było to konieczne do stwierdzenia charakteru, cech i funkcjonowania towaru.</p>
    <p>Prawo odstąpienia nie przysługuje, jeśli towar dostarczony w zapieczętowanym opakowaniu (np. z fabryczną plombą lub folią), którego po otwarciu nie można zwrócić ze względu na ochronę zdrowia lub ze względów higienicznych, został otwarty po dostarczeniu (art. 38 pkt 5 ustawy o prawach konsumenta), a także w innych przypadkach z §8 regulaminu.</p>
    </div>

    <h2 ${H2}>Wzór formularza odstąpienia od umowy</h2>
    <div ${SMALL}>
    <p>(formularz ten należy wypełnić i odesłać tylko w przypadku chęci odstąpienia od umowy)</p>
    <p>– Adresat: ${SELLER.legalName}, ${SELLER.address}, ${SELLER.email}<br>
    – Ja/My(*) niniejszym informuję/informujemy(*) o moim/naszym odstąpieniu od umowy sprzedaży następujących towarów: ………<br>
    – Data zawarcia umowy(*)/odbioru(*): ………<br>
    – Imię i nazwisko konsumenta(-ów): ………<br>
    – Adres konsumenta(-ów): ………<br>
    – Podpis konsumenta(-ów) (tylko jeżeli formularz jest przesyłany w wersji papierowej): ………<br>
    – Data: ………</p>
    <p>(*) Niepotrzebne skreślić.</p>
    </div>

    <h2 ${H2}>Reklamacje</h2>
    <p ${SMALL}>Odpowiadamy za zgodność towaru z umową przez 2 lata od dostarczenia. Reklamację złożysz e-mailem na ${SELLER.email} lub pocztą na ${SELLER.address}; odpowiemy w ciągu 14 dni. Możesz też skorzystać z bezpłatnej pomocy miejskiego lub powiatowego rzecznika konsumentów albo Wojewódzkiego Inspektoratu Inspekcji Handlowej (polubowne.uokik.gov.pl).</p>
    <p ${SMALL}>Pełne warunki: regulamin sklepu ${SITE}/regulamin, zwroty i reklamacje ${SITE}/zwroty.</p>
  `;
}
