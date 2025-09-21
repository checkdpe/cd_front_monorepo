# @acme/button
Minimal button built on Ant Design.

## API
```ts
type ButtonProps = {
  label: string;
  variant?: 'primary' | 'ghost';
  disabled?: boolean;
  onClick?: () => void;
};
```

Notes
- Internally uses `antd`'s `Button` with `type="primary"` and `ghost` mapped from `variant`.
- Requires peer deps: `react`, `react-dom`, and `antd`.
