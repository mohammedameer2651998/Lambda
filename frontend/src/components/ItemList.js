import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import './ItemList.css';

function ItemList() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch items when component mounts
  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getItems();
      setItems(data.items || []);
    } catch (err) {
      setError('Failed to load items. Make sure backend is running.');
      console.error('Error fetching items:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="loading">Loading items...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={fetchItems}>Retry</button>
      </div>
    );
  }

  return (
    <div className="item-list-container">
      <div className="header">
        <h1>Document Management System</h1>
        <Link to="/add" className="btn btn-primary">
          + Add New Item
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>No items yet. Create your first item!</p>
          <Link to="/add" className="btn btn-primary">
            Add Item
          </Link>
        </div>
      ) : (
        <div className="items-grid">
          {items.map((item) => (
            <div key={item.id} className="item-card">
              <h3>{item.name}</h3>
              <p className="item-date">
                Created: {new Date(item.createdAt).toLocaleDateString()}
              </p>
              <Link to={`/items/${item.id}`} className="btn btn-secondary">
                View Details
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ItemList;
