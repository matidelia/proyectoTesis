'use client';

import React, { useState, useEffect } from 'react';
import ProductCard from '@/components/ProductCard';

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  
  // Connection state
  const [connStatus, setConnStatus] = useState<'checking' | 'connected' | 'error'>('checking');
  const [connMessage, setConnMessage] = useState('');

  const quickTags = ['Laptops', 'Celulares', 'Zapatillas', 'Auriculares', 'Relojes'];

  useEffect(() => {
    // Check connection on mount
    const checkConnection = async () => {
      try {
        const res = await fetch('/api/status');
        const data = await res.json();
        if (data.connected) {
          setConnStatus('connected');
        } else {
          setConnStatus('error');
          setConnMessage(data.error || 'Error desconocido');
        }
      } catch (err) {
        setConnStatus('error');
        setConnMessage('Error de red al contactar servidor local.');
      }
    };
    checkConnection();
  }, []);

  const searchProducts = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setErrorDetails(null);
    setResults([]);
    
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      if (!res.ok) {
        // Guardamos el objeto completo del error para mostrarlo en pantalla
        setErrorDetails(data);
        return;
      }
      
      setResults(data.results || []);
    } catch (err: any) {
      console.error(err);
      setErrorDetails({ error: err.message || 'An unexpected network error occurred.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchProducts(query);
  };

  const handleTagClick = (tag: string) => {
    setQuery(tag);
    searchProducts(tag);
  };

  return (
    <>
      <header className="glass-header">
        <div className="container" style={{ textAlign: 'center', position: 'relative' }}>
          
          {/* Connection Status Badge */}
          <div style={{
            position: 'absolute',
            top: 0,
            right: '2rem',
            padding: '0.5rem 1rem',
            borderRadius: '9999px',
            fontSize: '0.8rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: connStatus === 'connected' ? 'rgba(0, 166, 80, 0.1)' : 
                        connStatus === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(255,255,255,0.1)',
            color: connStatus === 'connected' ? '#00a650' : 
                   connStatus === 'error' ? '#ef4444' : '#a1a1aa',
            border: `1px solid ${
              connStatus === 'connected' ? 'rgba(0, 166, 80, 0.2)' : 
              connStatus === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(255,255,255,0.2)'
            }`
          }}>
            <div style={{
              width: '8px', height: '8px', borderRadius: '50%',
              backgroundColor: connStatus === 'connected' ? '#00a650' : 
                               connStatus === 'error' ? '#ef4444' : '#a1a1aa'
            }} />
            {connStatus === 'checking' && 'Verificando API...'}
            {connStatus === 'connected' && 'API Conectada'}
            {connStatus === 'error' && 'Error de API'}
          </div>

          <h1>Mercado Libre App</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Buscador avanzado y seguro</p>
          
          <form className="search-container" onSubmit={handleSearch}>
            <input 
              type="text" 
              className="search-input" 
              placeholder="Buscar productos, marcas y más..." 
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button type="submit" className="search-button" disabled={loading}>
              {loading ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          <div className="quick-tags">
            {quickTags.map((tag) => (
              <button 
                key={tag} 
                type="button" 
                className="tag-btn" 
                onClick={() => handleTagClick(tag)}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="container">
        
        {/* Error Details Panel */}
        {errorDetails && (
          <div className="error-container" style={{ textAlign: 'left' }}>
            <h3 style={{ marginBottom: '1rem', borderBottom: '1px solid rgba(239,68,68,0.2)', paddingBottom: '0.5rem' }}>
              Oops, la búsqueda falló
            </h3>
            <p><strong>Mensaje:</strong> {errorDetails.error}</p>
            
            {errorDetails.details && (
              <div style={{ marginTop: '1.5rem' }}>
                <p style={{ fontSize: '0.9rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                  Detalles técnicos de Mercado Libre (Logs):
                </p>
                <pre style={{
                  background: 'rgba(0,0,0,0.3)',
                  padding: '1rem',
                  borderRadius: '8px',
                  overflowX: 'auto',
                  fontSize: '0.85rem',
                  color: '#e5e7eb'
                }}>
                  {JSON.stringify(errorDetails.details, null, 2)}
                </pre>
              </div>
            )}
            <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
              ℹ️ Si ves un error "forbidden", significa que tus credenciales funcionan pero no tienes permiso para acceder al buscador público mediante el flujo actual. 
              Revisa la consola de tu servidor (ej. Render) para ver los logs en tiempo real.
            </p>
          </div>
        )}

        {loading && (
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Cargando resultados...</p>
          </div>
        )}

        {!loading && !errorDetails && results.length > 0 && (
          <div className="products-grid">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {!loading && !errorDetails && results.length === 0 && query && (
          <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-secondary)' }}>
            No se encontraron resultados para "{query}"
          </div>
        )}
      </main>
    </>
  );
}
