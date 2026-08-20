const RAY_COUNT = 12

// A one-shot burst of rays, meant to be remounted (via a changing `key`
// on the caller's side) each time a correct answer should be celebrated.
export default function Starburst() {
  return (
    <div className="starburst" aria-hidden="true">
      <div className="starburst-flash" />
      {Array.from({ length: RAY_COUNT }).map((_, i) => (
        <span
          key={i}
          className="starburst-ray"
          style={{ '--angle': `${(360 / RAY_COUNT) * i}deg` } as React.CSSProperties}
        />
      ))}
    </div>
  )
}
