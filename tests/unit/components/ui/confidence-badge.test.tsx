import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { ConfidenceBadge, ConfidenceBadgeSimple, ConfidenceStats } from '@/components/ui/confidence-badge'

describe('ConfidenceBadge', () => {
  describe('Basic rendering', () => {
    it('renders empty state correctly', () => {
      render(<ConfidenceBadge confidence="empty" />)
      
      expect(screen.getByText('Vacío o no aplica')).toBeInTheDocument()
      const element = screen.getByRole('generic')
      expect(element.className).toContain('bg-gray-100')
      expect(element.className).toContain('text-gray-7')
    })

    it('renders needs_revision state correctly', () => {
      render(<ConfidenceBadge confidence="needs_revision" />)
      
      expect(screen.getByText('Necesita revisión')).toBeInTheDocument()
      const element = screen.getByRole('generic')
      expect(element.className).toContain('bg-orange-100')
      expect(element.className).toContain('text-orange-8')
    })

    it('renders trusted state correctly', () => {
      render(<ConfidenceBadge confidence="trusted" />)
      
      expect(screen.getByText('Confiable')).toBeInTheDocument()
      const element = screen.getByRole('generic')
      expect(element.className).toContain('bg-green-100')
      expect(element.className).toContain('text-green-8')
    })

    it('renders verified state correctly', () => {
      render(<ConfidenceBadge confidence="verified" />)
      
      expect(screen.getByText('Verificado')).toBeInTheDocument()
      const element = screen.getByRole('generic')
      expect(element.className).toContain('bg-blue-100')
      expect(element.className).toContain('text-blue-8')
    })

    it('handles null confidence gracefully', () => {
      render(<ConfidenceBadge confidence={null} />)
      
      expect(screen.getByText('Vacío o no aplica')).toBeInTheDocument()
      const element = screen.getByRole('generic')
      expect(element.className).toContain('bg-gray-100')
      expect(element.className).toContain('text-gray-7')
    })

    it('handles undefined confidence gracefully', () => {
      render(<ConfidenceBadge confidence={undefined} />)
      
      expect(screen.getByText('Vacío o no aplica')).toBeInTheDocument()
      const element = screen.getByRole('generic')
      expect(element.className).toContain('bg-gray-100')
      expect(element.className).toContain('text-gray-7')
    })
  })

  describe('Icon rendering', () => {
    it('shows icon when showIcon is true', () => {
      render(<ConfidenceBadge confidence="trusted" showIcon={true} />)
      
      // El icono debería estar presente
      const badge = screen.getByRole('generic')
      expect(badge.querySelector('svg')).toBeInTheDocument()
    })

    it('hides icon when showIcon is false', () => {
      render(<ConfidenceBadge confidence="trusted" showIcon={false} />)
      
      // El icono no debería estar presente
      const badge = screen.getByRole('generic')
      expect(badge.querySelector('svg')).not.toBeInTheDocument()
    })

    it('shows icon by default when showIcon is not specified', () => {
      render(<ConfidenceBadge confidence="trusted" />)
      
      // El icono debería estar presente por defecto
      const badge = screen.getByRole('generic')
      expect(badge.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Tooltip functionality', () => {
    it('shows tooltip when showTooltip is true', () => {
      render(<ConfidenceBadge confidence="needs_revision" showTooltip={true} />)
      
      // Buscar el elemento tooltip
      expect(screen.getByText(/documento procesado con campos/i)).toBeInTheDocument()
    })

    it('hides tooltip when showTooltip is false', () => {
      render(<ConfidenceBadge confidence="needs_revision" showTooltip={false} />)
      
      // El tooltip no debería estar presente
      expect(screen.queryByText(/documento procesado con campos/i)).not.toBeInTheDocument()
    })

    it('hides tooltip by default when showTooltip is not specified', () => {
      render(<ConfidenceBadge confidence="needs_revision" />)
      
      // El tooltip no debería estar presente por defecto
      expect(screen.queryByText(/documento procesado con campos/i)).not.toBeInTheDocument()
    })

    it('renders correct tooltip content for each state', () => {
      const tooltipTexts = {
        empty: /documento en procesamiento/i,
        needs_revision: /documento procesado con campos/i,
        trusted: /documento con todos los campos/i,
        verified: /documento revisado y verificado/i,
      }

      Object.entries(tooltipTexts).forEach(([confidence, expectedText]) => {
        const { unmount } = render(
          <ConfidenceBadge 
            confidence={confidence as any} 
            showTooltip={true} 
          />
        )
        
        expect(screen.getByText(expectedText)).toBeInTheDocument()
        unmount()
      })
    })
  })

  describe('Size variants', () => {
    it('renders small size correctly', () => {
      render(<ConfidenceBadge confidence="trusted" size="sm" />)
      
      const badge = screen.getByRole('generic')
      expect(badge.className).toContain('text-xs')
      expect(badge.className).toContain('px-2')
      expect(badge.className).toContain('py-1')
    })

    it('renders default size correctly', () => {
      render(<ConfidenceBadge confidence="trusted" />)
      
      const badge = screen.getByRole('generic')
      expect(badge.className).toContain('text-sm')
      expect(badge.className).toContain('px-2.5')
      expect(badge.className).toContain('py-0.5')
    })

    it('renders large size correctly', () => {
      render(<ConfidenceBadge confidence="trusted" size="lg" />)
      
      const badge = screen.getByRole('generic')
      expect(badge.className).toContain('text-base')
      expect(badge.className).toContain('px-3')
      expect(badge.className).toContain('py-1')
    })
  })

  describe('Custom className', () => {
    it('applies custom className correctly', () => {
      render(<ConfidenceBadge confidence="trusted" className="custom-class" />)
      
      const badge = screen.getByRole('generic')
      expect(badge.className).toContain('custom-class')
    })

    it('preserves base classes when custom className is provided', () => {
      render(<ConfidenceBadge confidence="trusted" className="custom-class" />)
      
      const badge = screen.getByRole('generic')
      expect(badge.className).toContain('custom-class')
      expect(badge.className).toContain('inline-flex')
      expect(badge.className).toContain('items-center')
    })
  })

  describe('Accessibility', () => {
    it('has proper aria-label for screen readers', () => {
      render(<ConfidenceBadge confidence="needs_revision" />)
      
      const badge = screen.getByLabelText(/estado de confianza: necesita revisión/i)
      expect(badge).toBeInTheDocument()
    })

    it('includes role attribute for semantic meaning', () => {
      render(<ConfidenceBadge confidence="verified" />)
      
      const badge = screen.getByRole('generic')
      expect(badge).toBeInTheDocument()
    })
  })
})

describe('ConfidenceBadgeSimple', () => {
  it('renders without icon', () => {
    render(<ConfidenceBadgeSimple confidence="trusted" />)
    
    expect(screen.getByText('Confiable')).toBeInTheDocument()
    const badge = screen.getByRole('generic')
    expect(badge.querySelector('svg')).not.toBeInTheDocument()
  })

  it('renders without tooltip', () => {
    render(<ConfidenceBadgeSimple confidence="needs_revision" />)
    
    expect(screen.getByText('Necesita revisión')).toBeInTheDocument()
    expect(screen.queryByText(/documento procesado con campos/i)).not.toBeInTheDocument()
  })

  it('respects custom className', () => {
    render(<ConfidenceBadgeSimple confidence="verified" className="simple-custom" />)
    
    const badge = screen.getByRole('generic')
    expect(badge.className).toContain('simple-custom')
  })
})

describe('ConfidenceStats', () => {
  const mockStats = {
    empty: 2,
    needs_revision: 5,
    trusted: 8,
    verified: 3,
  }

  it('renders all confidence stats correctly', () => {
    render(<ConfidenceStats stats={mockStats} total={18} />)
    
    // Verificar que cada tipo de confidence se muestre
    expect(screen.getByText('2')).toBeInTheDocument() // empty
    expect(screen.getByText('5')).toBeInTheDocument() // needs_revision
    expect(screen.getByText('8')).toBeInTheDocument() // trusted
    expect(screen.getByText('3')).toBeInTheDocument() // verified
  })

  it('only renders non-zero stats', () => {
    const partialStats = {
      empty: 0,
      needs_revision: 3,
      trusted: 0,
      verified: 2,
    }

    render(<ConfidenceStats stats={partialStats} total={5} />)
    
    // Solo deberían aparecer needs_revision y verified
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    
    // empty y trusted no deberían aparecer (buscar por texto exacto de labels)
    expect(screen.queryByText('Vacío o no aplica')).not.toBeInTheDocument()
    expect(screen.queryByText('Confiable')).not.toBeInTheDocument()
  })

  it('handles empty stats object', () => {
    render(<ConfidenceStats stats={{}} total={0} />)
    
    // No debería renderizar nada si no hay stats
    const container = screen.getByRole('group')
    expect(container).toBeEmptyDOMElement()
  })

  it('handles undefined stats gracefully', () => {
    render(<ConfidenceStats stats={undefined} total={0} />)
    
    // No debería fallar si stats es undefined
    const container = screen.getByRole('group')
    expect(container).toBeEmptyDOMElement()
  })

  it('applies custom className correctly', () => {
    render(<ConfidenceStats stats={mockStats} total={18} className="stats-custom" />)
    
    const container = screen.getByRole('group')
    expect(container.className).toContain('stats-custom')
  })

  it('calculates and displays percentages correctly', () => {
    render(<ConfidenceStats stats={mockStats} total={20} showPercentages={true} />)
    
    // Verificar que se muestren los porcentajes (texto contenido)
    expect(screen.getByText(/2.*10%/)).toBeInTheDocument() // 2/20 = 10%
    expect(screen.getByText(/5.*25%/)).toBeInTheDocument() // 5/20 = 25%
    expect(screen.getByText(/8.*40%/)).toBeInTheDocument() // 8/20 = 40%
    expect(screen.getByText(/3.*15%/)).toBeInTheDocument() // 3/20 = 15%
  })

  it('handles division by zero when calculating percentages', () => {
    render(<ConfidenceStats stats={mockStats} total={0} showPercentages={true} />)
    
    // No debería fallar con división por cero - cuando total es 0, no renderiza nada
    const container = screen.getByRole('group')
    expect(container).toBeEmptyDOMElement()
  })
})

describe('Integration tests', () => {
  it('works correctly when all components are used together', () => {
    const stats = {
      empty: 1,
      needs_revision: 2,
      trusted: 3,
      verified: 4,
    }

    render(
      <div>
        <div data-testid="badge-1">
          <ConfidenceBadge confidence="verified" showIcon={true} showTooltip={true} />
        </div>
        <div data-testid="badge-2">
          <ConfidenceBadgeSimple confidence="trusted" />
        </div>
        <div data-testid="stats">
          <ConfidenceStats stats={stats} total={10} />
        </div>
      </div>
    )

    // Verificar que todos los componentes se rendericen correctamente
    expect(screen.getAllByText('Verificado')).toHaveLength(2) // Uno en badge-1, otro en stats
    expect(screen.getAllByText('Confiable')).toHaveLength(2) // Uno en badge-2, otro en stats
    expect(screen.getByText('1')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('3')).toBeInTheDocument()
    expect(screen.getByText('4')).toBeInTheDocument()
  })

  it('maintains consistent styling across all components', () => {
    render(
      <div>
        <ConfidenceBadge confidence="needs_revision" />
        <ConfidenceBadgeSimple confidence="needs_revision" />
      </div>
    )

    const badges = screen.getAllByText('Necesita revisión')
    
    // Ambos badges deberían tener colores similares (verificar clases CSS)
    badges.forEach(badge => {
      const badgeElement = badge.closest('[role="generic"]')
      expect(badgeElement).toBeInTheDocument()
      expect(badgeElement?.className).toContain('bg-orange-100')
      expect(badgeElement?.className).toContain('text-orange-8')
    })
  })
})
