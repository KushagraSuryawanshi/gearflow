import type { AnchorHTMLAttributes } from 'react';
import { navigate } from '../app/navigation';

export function Link({ href = '/', onClick, ...props }: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a
      {...props}
      href={href}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.button !== 0 ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          props.target === '_blank'
        )
          return;
        event.preventDefault();
        navigate(href);
      }}
    />
  );
}
