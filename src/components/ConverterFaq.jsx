import { CONVERTER_FAQ } from '../seo/copy.js'

/** Lightweight FAQ block + structured data is attached via Seo.faq. */
export default function ConverterFaq() {
  return (
    <section className="converter-faq" aria-label="Frequently asked questions">
      <h2>FAQ</h2>
      {CONVERTER_FAQ.map((item) => (
        <details key={item.question} className="converter-faq-item">
          <summary>{item.question}</summary>
          <p>{item.answer}</p>
        </details>
      ))}
    </section>
  )
}
