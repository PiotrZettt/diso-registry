// API route for tenant context
import { NextRequest, NextResponse } from 'next/server';
import { getTenantFromHeaders } from '@/lib/middleware/tenant-middleware';
import { tenantService } from '@/services/tenant-service';

export async function GET(request: NextRequest) {
  try {
    const headers = request.headers;
    const { tenantId, tenantSlug } = getTenantFromHeaders(headers);
    
    if (!tenantId && !tenantSlug) {
      return NextResponse.json(
        { error: 'No tenant context found' },
        { status: 404 }
      );
    }
    
    // Get tenant
    let tenant = null;
    if (tenantId) {
      tenant = await tenantService.getTenantById(tenantId);
    } else if (tenantSlug) {
      tenant = await tenantService.getTenantBySlug(tenantSlug);
    }
    
    if (!tenant) {
      return NextResponse.json(
        { error: 'Tenant not found' },
        { status: 404 }
      );
    }
    
    // TODO: Get current user from session/JWT
    // For now, return without user
    const user: any = null;
    
    return NextResponse.json({
      tenant,
      user,
      permissions: user?.permissions || []
    });
    
  } catch (error) {
    console.error('Error getting tenant context:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
