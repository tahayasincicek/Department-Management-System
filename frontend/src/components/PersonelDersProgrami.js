import React, { useState } from 'react';
import axios from 'axios';
import './DersProgrami.css';

function PersonelDersProgrami() {
    const [programlar, setProgramlar] = useState({});
    const [loading, setLoading] = useState(false);
    const token = localStorage.getItem('token');

    const handleCreateAllPrograms = async () => {
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:3001/api/ogretim-ders-programlari/olustur', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProgramlar(res.data.programlar);
        } catch (err) {
            console.error('Programlar alınamadı:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="page-content">
            <h2>Tüm Öğretim Üyelerinin Ders Programları (Kapı İsimliği)</h2>

            <button onClick={handleCreateAllPrograms} disabled={loading} className="create-button">
                {loading ? 'Yükleniyor...' : 'Tüm Programları Oluştur'}
            </button>

            {Object.keys(programlar).length > 0 && (
                <>
                    <button onClick={handlePrint} className="print-button">Yazdır</button>
                    {Object.entries(programlar).map(([ogretmen, dersler], idx) => (
                        <div key={idx} style={{ marginTop: '30px' }}>
                            <h3>{ogretmen}</h3>
                            <table className="program-table">
                                <thead>
                                    <tr>
                                        <th>Ders Adı</th>
                                        <th>Gün</th>
                                        <th>Saat</th>
                                        <th>Derslik</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {dersler.map((ders, index) => (
                                        <tr key={index}>
                                            <td>{ders.ders_adi}</td>
                                            <td>{ders.gun}</td>
                                            <td>{ders.saat}</td>
                                            <td>{ders.derslik}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ))}
                </>
            )}
        </div>
    );
}

export default PersonelDersProgrami;
