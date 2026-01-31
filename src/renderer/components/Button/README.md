# Button Components

Reusable button components with multiple variants and configurations.

## ButtonPlain

Base button component with variants and sizes.

### Props

- `variant?: 'primary' | 'secondary' | 'outline' | 'ghost'` - Button style variant
- `size?: 'sm' | 'md' | 'lg'` - Button size
- `isLoading?: boolean` - Show loading state
- `disabled?: boolean` - Disable button
- All standard HTML button attributes

### Usage

```tsx
import { ButtonPlain } from '@components/Button';

// Primary button
<ButtonPlain variant="primary">Click Me</ButtonPlain>

// Secondary button with loading
<ButtonPlain variant="secondary" isLoading>
  Processing...
</ButtonPlain>

// Outline button, small size
<ButtonPlain variant="outline" size="sm">
  Cancel
</ButtonPlain>

// Ghost button, disabled
<ButtonPlain variant="ghost" disabled>
  Disabled
</ButtonPlain>
```

## ButtonIconed

Button with icon support.

### Props

Extends `ButtonPlainProps` with:
- `icon: React.ReactNode` - Icon element
- `iconPosition?: 'left' | 'right'` - Icon position

### Usage

```tsx
import { ButtonIconed } from '@components/Button';

<ButtonIconed
  icon={<PlusIcon />}
  iconPosition="left"
  variant="primary"
>
  Add Item
</ButtonIconed>

<ButtonIconed
  icon={<CheckIcon />}
  iconPosition="right"
  variant="secondary"
>
  Save
</ButtonIconed>
```

## ButtonGroup

Grouped buttons with shared styling.

### Props

- `buttons: Array<ButtonPlainProps & { key: string }>` - Array of button configurations
- `className?: string` - Additional CSS classes

### Usage

```tsx
import { ButtonGroup } from '@components/Button';

<ButtonGroup
  buttons={[
    { key: '1', children: 'First', variant: 'primary' },
    { key: '2', children: 'Second', variant: 'outline' },
    { key: '3', children: 'Third', variant: 'outline' },
  ]}
/>
```

