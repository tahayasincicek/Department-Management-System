import React, { useState } from 'react';
import axios from 'axios';
import './DersProgrami.css';

function OgretimDersProgrami() {
    const [program, setProgram] = useState([]);
    const [loading, setLoading] = useState(false);
    const [created, setCreated] = useState(false);
    const token = localStorage.getItem('token');

    const handleCreateProgram = async () => {
        setLoading(true);
        try {
            const res = await axios.post('http://localhost:3001/api/ogretim-ders-programi/olustur', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setProgram(res.data.program);
            setCreated(true);
        } catch (err) {
            console.error('Program oluşturulamadı:', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="page-content">
            <h2>Öğretim Elemanı Ders Programı (Kapı İsimliği)</h2>

            <button onClick={handleCreateProgram} disabled={loading} className="create-button">
                {loading ? 'Oluşturuluyor...' : 'Ders Programımı Oluştur'}
            </button>

            {created && (
                <>
                    <button onClick={handlePrint} className="print-button">Yazdır</button>
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
                            {program.map((ders, idx) => (
                                <tr key={idx}>
                                    <td>{ders.ders_adi}</td>
                                    <td>{ders.gun}</td>
                                    <td>{ders.saat}</td>
                                    <td>{ders.derslik}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </>
            )}
        </div>
    );
}

export default OgretimDersProgrami;
