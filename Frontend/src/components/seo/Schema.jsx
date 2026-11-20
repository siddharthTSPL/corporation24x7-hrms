import { Helmet } from "react-helmet-async";

// Drop-in JSON-LD for any custom page: <Schema data={{ "@context": "https://schema.org", ... }} />
// Only mark up facts that are visible on the page. Never add invented ratings, reviews or prices.
export default function Schema({ data }) {
  return (
    <Helmet>
      <script type="application/ld+json">{JSON.stringify(data)}</script>
    </Helmet>
  );
}
