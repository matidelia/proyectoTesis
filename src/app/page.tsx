'use client';

import React, { useState } from 'react';
import ProductCard from '@/components/ProductCard';

export default function Home() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const quickTags = ['Laptops', 'Celulares', 'Zapatillas', 'Auriculares', 'Relojes'];

  const searchProducts = async (searchQuery: string) => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to search products');
      }
      
      setResults(data.results || []);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An unexpected error occurred.');
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
        <div className="container" style={{ textAlign: 'center' }}>
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
        {error && (
          <div className="error-container">
            <h3>Oops, algo salió mal</h3>
            <p>{error}</p>
            <p style={{ marginTop: '1rem', fontSize: '0.9rem' }}>
              Asegúrate de que tu aplicación en Mercado Libre tiene los permisos necesarios o intenta de nuevo más tarde.
            </p>
          </div>
        )}

        {loading && (
          <div className="loader-container">
            <div className="spinner"></div>
            <p>Cargando resultados...</p>
          </div>
        )}

        {!loading && !error && results.length > 0 && (
          <div className="products-grid">
            {results.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {!loading && !error && results.length === 0 && query && (
          <div style={{ textAlign: 'center', marginTop: '4rem', color: 'var(--text-secondary)' }}>
            No se encontraron resultados para "{query}"
          </div>
        )}
      </main>
    </>
  );
}
