import React from 'react';
import Select from 'react-select';
import useThemeStore from '../../store/themeStore';

const Dropdown = ({
  options = [],
  value,
  onChange,
  placeholder = 'Select...',
  isMulti = false,
  isSearchable = true,
  isClearable = false,
  className = '',
  ...props
}) => {
  const theme = useThemeStore((state) => state.theme);
  const isDark = theme === 'dark';

  const customStyles = {
    control: (provided, state) => ({
      ...provided,
      backgroundColor: isDark ? 'var(--color-base-background)' : 'var(--color-base-background-light)',
      borderColor: state.isFocused
        ? 'var(--color-primary-accent)'
        : 'var(--color-border-muted)',
      borderRadius: '0.5rem',
      padding: '0.25rem',
      minHeight: '42px',
      boxShadow: state.isFocused
        ? `0 0 0 1px var(--color-primary-accent)`
        : 'none',
      '&:hover': {
        borderColor: 'var(--color-primary-accent)',
      },
    }),
    menu: (provided) => ({
      ...provided,
      backgroundColor: isDark ? 'var(--color-base-background-light)' : 'var(--color-base-background-light)',
      border: `1px solid var(--color-border-muted)`,
      borderRadius: '0.5rem',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      zIndex: 9999,
    }),
    option: (provided, state) => ({
      ...provided,
      backgroundColor: state.isSelected
        ? 'var(--color-primary-accent)'
        : state.isFocused
        ? isDark
          ? 'var(--color-base-background)'
          : 'var(--color-base-background-dark)'
        : 'transparent',
      color: state.isSelected
        ? '#ffffff'
        : 'var(--color-text-primary)',
      cursor: 'pointer',
      '&:active': {
        backgroundColor: 'var(--color-primary-accent)',
        color: '#ffffff',
      },
    }),
    singleValue: (provided) => ({
      ...provided,
      color: 'var(--color-text-primary)',
    }),
    multiValue: (provided) => ({
      ...provided,
      backgroundColor: isDark
        ? 'var(--color-secondary-muted)'
        : 'var(--color-secondary-muted-light)',
    }),
    multiValueLabel: (provided) => ({
      ...provided,
      color: 'var(--color-text-primary)',
    }),
    multiValueRemove: (provided) => ({
      ...provided,
      color: 'var(--color-text-primary)',
      '&:hover': {
        backgroundColor: 'var(--color-error)',
        color: '#ffffff',
      },
    }),
    input: (provided) => ({
      ...provided,
      color: 'var(--color-text-primary)',
    }),
    placeholder: (provided) => ({
      ...provided,
      color: 'var(--color-text-muted)',
    }),
    indicatorSeparator: (provided) => ({
      ...provided,
      backgroundColor: 'var(--color-border-muted)',
    }),
    dropdownIndicator: (provided) => ({
      ...provided,
      color: 'var(--color-text-secondary)',
      '&:hover': {
        color: 'var(--color-primary-accent)',
      },
    }),
    clearIndicator: (provided) => ({
      ...provided,
      color: 'var(--color-text-secondary)',
      '&:hover': {
        color: 'var(--color-error)',
      },
    }),
  };

  return (
    <div className={className}>
      <Select
        options={options}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        isMulti={isMulti}
        isSearchable={isSearchable}
        isClearable={isClearable}
        styles={customStyles}
        classNamePrefix="omnis-select"
        {...props}
      />
    </div>
  );
};

export default Dropdown;

