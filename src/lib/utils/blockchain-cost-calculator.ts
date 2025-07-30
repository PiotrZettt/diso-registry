// Blockchain Cost Calculator for DeFi ISO Registry
// This helps certification bodies understand costs upfront

export interface CostBreakdown {
  operation: string;
  quantity: number;
  unitCost: number;
  totalCost: number;
  currency: string;
  network: string;
}

export interface BulkDiscount {
  minQuantity: number;
  maxQuantity?: number;
  discountPercent: number;
}

export class BlockchainCostCalculator {
  private baseCosts = {
    tezos: {
      certificateCreate: 0.015,  // $0.015 in XTZ equivalent
      statusUpdate: 0.008,
      bulkCreate: 0.012,  // Slight discount for bulk
      currency: 'XTZ'
    },
    etherlink: {
      certificateCreate: 0.005,  // Cheaper for frequent operations
      statusUpdate: 0.003,
      bulkCreate: 0.004,
      currency: 'ETH'
    }
  };

  private bulkDiscounts: BulkDiscount[] = [
    { minQuantity: 10, maxQuantity: 49, discountPercent: 10 },
    { minQuantity: 50, maxQuantity: 99, discountPercent: 20 },
    { minQuantity: 100, maxQuantity: 499, discountPercent: 30 },
    { minQuantity: 500, discountPercent: 40 }
  ];

  /**
   * Calculate cost for certificate operations
   */
  calculateCertificateCosts(quantity: number, includeUpdates = true): CostBreakdown[] {
    const breakdown: CostBreakdown[] = [];
    
    // Calculate creation costs
    const discount = this.getBulkDiscount(quantity);
    const tezosUnitCost = this.baseCosts.tezos.certificateCreate * (1 - discount);
    const etherlinkUnitCost = this.baseCosts.etherlink.certificateCreate * (1 - discount);
    
    breakdown.push({
      operation: 'Certificate Creation (Tezos)',
      quantity,
      unitCost: tezosUnitCost,
      totalCost: tezosUnitCost * quantity,
      currency: 'XTZ',
      network: 'tezos'
    });
    
    breakdown.push({
      operation: 'Certificate Creation (Etherlink)',
      quantity,
      unitCost: etherlinkUnitCost,
      totalCost: etherlinkUnitCost * quantity,
      currency: 'ETH',
      network: 'etherlink'
    });
    
    // Estimate update costs (assume 20% of certificates get status updates)
    if (includeUpdates) {
      const updateQuantity = Math.ceil(quantity * 0.2);
      
      breakdown.push({
        operation: 'Status Updates (Estimated)',
        quantity: updateQuantity,
        unitCost: this.baseCosts.etherlink.statusUpdate,
        totalCost: this.baseCosts.etherlink.statusUpdate * updateQuantity,
        currency: 'ETH',
        network: 'etherlink'
      });
    }
    
    return breakdown;
  }

  /**
   * Calculate monthly costs for a certification body
   */
  calculateMonthlyCosts(certsPerMonth: number, updatesPerMonth: number): {
    breakdown: CostBreakdown[];
    totalUsd: number;
    recommendations: string[];
  } {
    const breakdown = this.calculateCertificateCosts(certsPerMonth, false);
    
    // Add actual updates
    breakdown.push({
      operation: 'Status Updates',
      quantity: updatesPerMonth,
      unitCost: this.baseCosts.etherlink.statusUpdate,
      totalCost: this.baseCosts.etherlink.statusUpdate * updatesPerMonth,
      currency: 'ETH',
      network: 'etherlink'
    });
    
    // Convert to USD (simplified - in production, use real exchange rates)
    const xtzToUsd = 0.85;  // Approximate XTZ price
    const ethToUsd = 2500;  // Approximate ETH price
    
    const totalUsd = breakdown.reduce((sum, item) => {
      const rate = item.currency === 'XTZ' ? xtzToUsd : ethToUsd;
      return sum + (item.totalCost * rate);
    }, 0);
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(certsPerMonth, totalUsd);
    
    return { breakdown, totalUsd, recommendations };
  }

  /**
   * Compare custodial vs Web3 wallet costs
   */
  compareCustodialVsWeb3(certsPerMonth: number): {
    custodial: { cost: number; features: string[] };
    web3: { cost: number; features: string[] };
    recommendation: string;
  } {
    const baseCost = this.calculateMonthlyCosts(certsPerMonth, certsPerMonth * 0.2).totalUsd;
    
    const custodial = {
      cost: baseCost + (baseCost * 0.1), // 10% markup for custodial service
      features: [
        'No wallet management needed',
        'Pay via credit card',
        'Automatic gas management',
        'Customer support included',
        'GDPR compliant storage'
      ]
    };
    
    const web3 = {
      cost: baseCost,
      features: [
        'Full control of keys',
        'Direct blockchain interaction',
        'Lower costs (no markup)',
        'Maximum transparency',
        'Self-custodial security'
      ]
    };
    
    const recommendation = certsPerMonth < 50 
      ? 'Custodial wallet recommended for easy start'
      : 'Web3 wallet recommended for cost savings at scale';
    
    return { custodial, web3, recommendation };
  }

  /**
   * Generate pricing tiers for different user segments
   */
  generatePricingTiers(): Array<{
    name: string;
    certsPerMonth: string;
    monthlyFee: number;
    perCertCost: number;
    features: string[];
    recommended: boolean;
  }> {
    return [
      {
        name: 'Starter',
        certsPerMonth: '1-10',
        monthlyFee: 0,
        perCertCost: 0.02,
        features: [
          'Custodial wallet included',
          'Basic dashboard',
          'Email support',
          'Public verification'
        ],
        recommended: false
      },
      {
        name: 'Professional',
        certsPerMonth: '11-100',
        monthlyFee: 29,
        perCertCost: 0.015,
        features: [
          'Choice of custodial or Web3',
          'Advanced analytics',
          'API access',
          'Priority support',
          'Bulk operations'
        ],
        recommended: true
      },
      {
        name: 'Enterprise',
        certsPerMonth: '100+',
        monthlyFee: 99,
        perCertCost: 0.01,
        features: [
          'Web3 wallet recommended',
          'Custom integrations',
          'White-label options',
          'Dedicated support',
          'SLA guarantees'
        ],
        recommended: false
      }
    ];
  }

  private getBulkDiscount(quantity: number): number {
    const discount = this.bulkDiscounts.find(d => 
      quantity >= d.minQuantity && 
      (d.maxQuantity === undefined || quantity <= d.maxQuantity)
    );
    return discount ? discount.discountPercent / 100 : 0;
  }

  private generateRecommendations(certsPerMonth: number, totalUsd: number): string[] {
    const recommendations: string[] = [];
    
    if (certsPerMonth < 10) {
      recommendations.push('Start with custodial wallet for easier onboarding');
      recommendations.push('Consider our Starter plan at $0.02 per certificate');
    } else if (certsPerMonth < 100) {
      recommendations.push('Professional plan offers better value with monthly fee');
      recommendations.push('Consider Web3 wallet for cost savings');
    } else {
      recommendations.push('Enterprise plan recommended for your volume');
      recommendations.push('Web3 wallet will save significant costs at this scale');
      recommendations.push('Consider bulk operations to reduce gas fees');
    }
    
    if (totalUsd > 50) {
      recommendations.push('Bulk discounts available - consider batching operations');
    }
    
    return recommendations;
  }
}

// Usage example
export function demonstrateCostCalculator() {
  const calculator = new BlockchainCostCalculator();
  
  console.log('📊 Blockchain Cost Analysis for DeFi ISO Registry\n');
  
  // Example: Medium certification body
  const certsPerMonth = 45;
  const costs = calculator.calculateMonthlyCosts(certsPerMonth, 9);
  
  console.log(`💼 Certification Body Example (${certsPerMonth} certs/month):`);
  console.log('─'.repeat(60));
  
  costs.breakdown.forEach(item => {
    console.log(`${item.operation}: ${item.quantity} × $${item.unitCost.toFixed(4)} = $${item.totalCost.toFixed(3)} ${item.currency}`);
  });
  
  console.log(`\n💰 Total Monthly Cost: $${costs.totalUsd.toFixed(2)} USD`);
  console.log(`📈 Cost per Certificate: $${(costs.totalUsd / certsPerMonth).toFixed(3)}`);
  
  console.log('\n🎯 Recommendations:');
  costs.recommendations.forEach(rec => console.log(`• ${rec}`));
  
  // Compare wallet options
  console.log('\n🔐 Wallet Comparison:');
  const comparison = calculator.compareCustodialVsWeb3(certsPerMonth);
  console.log(`Custodial: $${comparison.custodial.cost.toFixed(2)}/month`);
  console.log(`Web3: $${comparison.web3.cost.toFixed(2)}/month`);
  console.log(`💡 ${comparison.recommendation}`);
  
  // Show pricing tiers
  console.log('\n💎 Pricing Tiers:');
  const tiers = calculator.generatePricingTiers();
  tiers.forEach(tier => {
    const marker = tier.recommended ? '⭐' : '  ';
    console.log(`${marker} ${tier.name}: $${tier.monthlyFee}/month + $${tier.perCertCost}/cert`);
  });
}

export const blockchainCostCalculator = new BlockchainCostCalculator();
