import React from 'react';
import { useNavigate } from 'react-router-dom';
import './YetkisizErisim.css';

const YetkisizErisim = () => {
    const navigate = useNavigate();

    return (
        <div className="yetkisiz-container">
            <h2>❌ Yetkisiz Erişim</h2>
            <p>Bu sayfaya erişim yetkiniz bulunmamaktadır.</p>
            <button onClick={() => navigate('/')}>Ana Sayfaya Dön</button>
        </div>
    );
};

export default YetkisizErisim;
