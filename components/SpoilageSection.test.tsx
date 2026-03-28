import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import SpoilageSection from './SpoilageSection';

describe('SpoilageSection', () => {
  it('renders spoilage reference cards and emergency discard signs', () => {
    render(<SpoilageSection />);

    expect(screen.getByText('Understanding Spores & Mold')).toBeInTheDocument();
    expect(screen.getByText('Temperature Danger Zone')).toBeInTheDocument();
    expect(screen.getByText('Discard immediately')).toBeInTheDocument();
    expect(screen.getByText('Slimy coating')).toBeInTheDocument();
    expect(screen.getByText('Visible mold')).toBeInTheDocument();
    expect(screen.getByText('Sharp off odor')).toBeInTheDocument();
  });
});
