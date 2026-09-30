import React from 'react';
import * as Icons from 'lucide-react';

export default function Icon({ name, className = 'w-5 h-5', ...props }) {
  const IconComponent = Icons[name] || Icons.HelpCircle;
  return <IconComponent className={className} {...props} />;
}
