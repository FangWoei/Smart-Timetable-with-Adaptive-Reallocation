import { useState } from 'react'

/**
 * Top-left logo slot.
 * Drop your image at  public/logo.png  (or pass a different `src`).
 * While the file is missing, a dashed placeholder is shown instead.
 */
export default function Logo({ src = '/peninsula-logo.png', alt = 'Institution logo', bordered = false }) {
  const [failed, setFailed] = useState(false)

  return (
    <div
      className={[
        'flex h-[30px] w-[152px] shrink-0 items-center justify-center rounded bg-white px-2',
        bordered ? 'border border-line' : '',
      ].join(' ')}
    >
      {failed ? (
        <span className="flex h-full w-full items-center justify-center rounded-sm border border-dashed border-line-strong text-[11px] text-ink-4">
          Logo here
        </span>
      ) : (
        <img
          src={src}
          alt={alt}
          onError={() => setFailed(true)}
          className="max-h-[21px] w-auto max-w-full object-contain"
        />
      )}
    </div>
  )
}
