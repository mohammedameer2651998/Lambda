import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './AddItem.css';

function AddItem() {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim()) {
      setError('Item name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const newItem = await api.createItem({ name: name.trim() });
      console.log('Item created:', newItem);
      // Navigate to the newly created item's detail page
      navigate(`/items/${newItem.id}`);
    } catch (err) {
      setError('Failed to create item. Please try again.');
      console.error('Error creating item:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="add-item-container">
      <h1>Add New Item</h1>
      
      <form onSubmit={handleSubmit} className="add-item-form">
        <div className="form-group">
          <label htmlFor="name">Item Name</label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter item name (e.g., Contract Document)"
            disabled={loading}
          />
        </div>

        {error && <div className="error-message">{error}</div>}

        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Item'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => navigate('/')}
            disabled={loading}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddItem;
