import { blockchainService } from '@/services/blockchain-service';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const balanceInfo = await blockchainService.getWalletBalance();
    return NextResponse.json({ success: true, data: balanceInfo });
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
