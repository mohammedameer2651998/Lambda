import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './ItemDetail.css';

function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  useEffect(() => {
    fetchItem();
  }, [id]);

  const fetchItem = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await api.getItemById(id);
      setItem(data);
    } catch (err) {
      setError('Failed to load item details');
      console.error('Error fetching item:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    setSelectedFile(file);
    setUploadError(null);
  };

  const handleFileUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    try {
      setUploading(true);
      setUploadError(null);
      await api.uploadFile(id, selectedFile);
      setSelectedFile(null);
      // Reset file input
      const fileInput = document.querySelector('.file-input');
      if (fileInput) fileInput.value = '';
      // Refresh item to show new file
      await fetchItem();
    } catch (err) {
      console.error('Error uploading file:', err);
      setUploadError(err.response?.data?.error || 'Failed to upload file');
    } finally {
      setUploading(false);
    }
  };

  const handleFileDownload = async (file) => {
    try {
      const { url } = await api.getFileUrl(id, file._id);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error getting file URL:', err);
      alert('Failed to download file');
    }
  };

  const handleFileDelete = async (file) => {
    if (!window.confirm(`Delete ${file.filename}?`)) return;
    
    try {
      await api.deleteFile(id, file._id);
      await fetchItem();
    } catch (err) {
      console.error('Error deleting file:', err);
      alert('Failed to delete file');
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
  };

  if (loading) {
    return <div className="loading">Loading item details...</div>;
  }

  if (error) {
    return (
      <div className="error">
        <p>{error}</p>
        <button onClick={() => navigate('/')}>Back to List</button>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="error">
        <p>Item not found</p>
        <button onClick={() => navigate('/')}>Back to List</button>
      </div>
    );
  }

  return (
    <div className="item-detail-container">
      <button onClick={() => navigate('/')} className="btn-back">
        ← Back to List
      </button>

      <div className="item-detail-card">
        <h1>{item.name}</h1>
        <div className="item-meta">
          <p><strong>ID:</strong> {item._id || item.id}</p>
          <p><strong>Created:</strong> {new Date(item.createdAt).toLocaleString()}</p>
        </div>

        <div className="file-upload-section">
          <h2>File Attachments</h2>
          
          <div className="upload-controls">
            <input
              type="file"
              onChange={handleFileSelect}
              disabled={uploading}
              className="file-input"
            />
            {selectedFile && (
              <div className="selected-file">
                Selected: {selectedFile.name} ({formatFileSize(selectedFile.size)})
              </div>
            )}
            <button
              onClick={handleFileUpload}
              disabled={!selectedFile || uploading}
              className="btn btn-primary"
            >
              {uploading ? 'Uploading...' : 'Upload File'}
            </button>
            {uploadError && <p className="upload-error">{uploadError}</p>}
          </div>

          <div className="files-list">
            {item.files && item.files.length > 0 ? (
              <ul className="file-items">
                {item.files.map((file, index) => (
                  <li key={file.s3Key || index} className="file-item">
                    <div className="file-info">
                      <span className="file-name">{file.filename}</span>
                      <span className="file-size">{formatFileSize(file.size)}</span>
                      <span className="file-date">
                        {new Date(file.uploadedAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="file-actions">
                      <button 
                        onClick={() => handleFileDownload(file)}
                        className="btn btn-small btn-download"
                      >
                        Download
                      </button>
                      <button 
                        onClick={() => handleFileDelete(file)}
                        className="btn btn-small btn-delete"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="placeholder">No files attached yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ItemDetail;
