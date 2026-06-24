import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { ProductsResponse } from '@/types';

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);

        // Parse and validate pagination limit
        const limitQuery = searchParams.get('limit');
        let limit = 20;
        if (limitQuery) {
            const parsedLimit = parseInt(limitQuery, 10);
            if (!isNaN(parsedLimit)) {
                limit = Math.max(1, Math.min(parsedLimit, 100)); // clamp between 1 and 100
            }
        }

        // Category filter
        const category = searchParams.get('category');

        // Decode base64 cursor
        const cursorQuery = searchParams.get('cursor');
        let cursorObj = undefined;

        if (cursorQuery) {
            try {
                const decoded = Buffer.from(cursorQuery, 'base64').toString('utf-8');
                const parsed = JSON.parse(decoded);

                if (parsed.createdAt && parsed.id) {
                    cursorObj = {
                        createdAt_id: {
                            createdAt: new Date(parsed.createdAt),
                            id: parsed.id,
                        },
                    };
                }
            } catch (err) {
                console.error('Failed to parse cursor:', err);
                return NextResponse.json(
                    { error: 'Invalid cursor format' },
                    { status: 400 }
                );
            }
        }

        // Fetch limit + 1 items. If we get limit + 1, it means we have a next page.
        const products = await prisma.product.findMany({
            take: limit + 1,
            where: {
                category: category || undefined,
            },
            cursor: cursorObj,
            orderBy: [
                { createdAt: 'desc' },
                { id: 'desc' },
            ],
            // If we are using a cursor, we skip the cursor record itself
            skip: cursorObj ? 1 : 0,
        });

        const hasMore = products.length > limit;
        const returnedProducts = hasMore ? products.slice(0, limit) : products;

        // Generate next cursor if we have more records
        let nextCursor: string | null = null;
        if (hasMore && returnedProducts.length > 0) {
            const lastProduct = returnedProducts[returnedProducts.length - 1];
            const cursorPayload = {
                createdAt: lastProduct.createdAt.toISOString(),
                id: lastProduct.id,
            };
            nextCursor = Buffer.from(JSON.stringify(cursorPayload)).toString('base64');
        }

        const response: ProductsResponse = {
            products: returnedProducts.map((p) => ({
                id: p.id,
                name: p.name,
                price: p.price,
                category: p.category,
                description: p.description,
                imageUrl: p.imageUrl,
                createdAt: p.createdAt.toISOString(),
            })),
            nextCursor,
            hasMore,
        };

        // Add Cache-Control header to enable fast clients but prevent stale search pagination
        return NextResponse.json(response, {
            headers: {
                'Cache-Control': 'no-store, max-age=0, must-revalidate',
            },
        });
    } catch (error) {
        console.error('Database query failed:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
