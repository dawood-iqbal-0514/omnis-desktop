import React from 'react';
import ButtonPlain from './ButtonPlain';

const ButtonIconed = ({
  icon,
  iconPosition = 'left',
  isLoading = false,
  children,
  className = '',
  ...props
}) => {
  if (isLoading) {
    return (
      <ButtonPlain isLoading={isLoading} className={className} {...props}>
        {children}
      </ButtonPlain>
    );
  }

  const iconElement = (
    <span className={iconPosition === 'left' ? 'mr-2' : 'ml-2'}>
      {icon}
    </span>
  );

  return (
    <ButtonPlain className={className} {...props}>
      {iconPosition === 'left' ? (
        <>
          {iconElement}
          {children}
        </>
      ) : (
        <>
          {children}
          {iconElement}
        </>
      )}
    </ButtonPlain>
  );
};

export default ButtonIconed;

