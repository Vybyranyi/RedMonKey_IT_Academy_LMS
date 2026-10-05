import { render, screen } from '@testing-library/react';
import { Users } from 'lucide-react';
import { describe, expect, it } from 'vitest';
import StatCard from '../StatCard';

describe('StatCard', () => {
  // Раніше підпис мав truncate і в вузькій картці читався як «Занять…»
  it('довгий підпис переноситься, а не обрізається', () => {
    render(
      <StatCard label="Занять цього тижня" value={3} icon={Users} hint="Включно з минулими" />
    );

    expect(screen.getByText('Занять цього тижня')).not.toHaveClass('truncate');
    expect(screen.getByText('Включно з минулими')).toBeInTheDocument();
  });

  it('декоративна іконка прихована від скрінрідера', () => {
    const { container } = render(<StatCard label="Студенти" value={6} icon={Users} />);

    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  });
});
