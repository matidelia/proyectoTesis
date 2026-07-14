require('dotenv').config({ path: '.env.local' });
require('dotenv').config({ path: '.env' });
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkToken() {
    try {
        const token = await prisma.oAuthToken.findUnique({
            where: { id: 'mercado_libre' }
        });

        if (!token) {
            console.log('No se encontró token de usuario en la base de datos.');
            return;
        }

        console.log('Token encontrado. Verificando con Mercado Libre...');
        
        // ML no tiene un endpoint de "check token" público simple, 
        // pero podemos probar el endpoint de /users/me que requiere scopes básicos.
        const res = await fetch('https://api.mercadolibre.com/users/me', {
            headers: { 'Authorization': `Bearer ${token.accessToken}` }
        });

        const data = await res.json();

        if (res.ok) {
            console.log('✓ Token Válido');
            console.log('Usuario:', data.nickname);
            console.log('ID Usuario:', data.id);
            console.log('País:', data.site_id);
        } else {
            console.error('❌ Token Inválido o sin permisos:', data);
        }

    } catch (e) {
        console.error('Error:', e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkToken();
