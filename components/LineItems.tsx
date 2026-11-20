import Link from 'next/link'
import { addLineItem, deleteLineItem } from '@/app/actions'
import { formatCurrency, formatNumber } from '@/lib/format'
import { ObjectIcon } from './ObjectIcon'
import { OBJECTS } from '@/lib/objects'
import { SubmitButton } from './ConfirmButton'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Row = any

/** Products on an opportunity, with an add-product form. */
export function LineItems({ opportunityId, items, products }: { opportunityId: string; items: Row[]; products: Row[] }) {
  const total = items.reduce((t, i) => t + Number(i.total_price ?? 0), 0)
  return (
    <section className="card related">
      <div className="card-header">
        <h2>
          <ObjectIcon def={OBJECTS.products} size="sm" /> Products ({items.length})
        </h2>
        {items.length > 0 && <strong>{formatCurrency(total)}</strong>}
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Product</th>
              <th className="num">Quantity</th>
              <th className="num">Sales Price</th>
              <th className="num">Discount</th>
              <th className="num">Total</th>
              <th aria-label="Actions" />
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} className="muted empty-row">
                  No products yet. Adding products sets the opportunity amount automatically.
                </td>
              </tr>
            )}
            {items.map((i) => (
              <tr key={i.id}>
                <td>{i.product ? <Link href={`/products/${i.product.id}`}>{i.product.name}</Link> : '—'}</td>
                <td className="num">{formatNumber(i.quantity)}</td>
                <td className="num">{formatCurrency(i.unit_price)}</td>
                <td className="num">{Number(i.discount) ? `${i.discount}%` : ''}</td>
                <td className="num">{formatCurrency(i.total_price)}</td>
                <td className="num">
                  <form action={deleteLineItem}>
                    <input type="hidden" name="__id" value={i.id} />
                    <input type="hidden" name="opportunity_id" value={opportunityId} />
                    <button type="submit" className="link-btn" title="Remove product">
                      Remove
                    </button>
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <form action={addLineItem} className="add-line">
        <input type="hidden" name="opportunity_id" value={opportunityId} />
        <select name="product_id" required defaultValue="" aria-label="Product">
          <option value="" disabled>
            Add a product…
          </option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} — {formatCurrency(p.unit_price)}
            </option>
          ))}
        </select>
        <input name="quantity" type="number" min="0.01" step="0.01" defaultValue="1" aria-label="Quantity" title="Quantity" />
        <input name="unit_price" type="number" min="0" step="0.01" placeholder="List price" aria-label="Sales price" title="Sales price (blank = list price)" />
        <input name="discount" type="number" min="0" max="100" step="0.01" placeholder="Disc. %" aria-label="Discount percent" title="Discount %" />
        <SubmitButton className="btn btn-sm">Add</SubmitButton>
      </form>
    </section>
  )
}
