import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import axios from 'axios';
import './SinavOturma.css';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

function SinavOturma() {
    const [sinavId, setSinavId] = useState('');
    const [seciliSinif, setSeciliSinif] = useState('amfi1');
    const [seatingPlans, setSeatingPlans] = useState({});
    const [gozcu, setGozcu] = useState('');
    const [toplamOgrenci, setToplamOgrenci] = useState(0);
    const [kapasite, setKapasite] = useState(0);
    const [show, setShow] = useState(false);
    const [sinavAdi, setSinavAdi] = useState('');
    const printRef = useRef();

    const token = localStorage.getItem('token');
    const role = localStorage.getItem('role');

    const sinifDuzenleri = useMemo(() => ({
        amfi1: { layout: [4, 3, 4], sira: 9 },
        "108": { layout: [2, 2, 2, 2], sira: 7 }
    }), []);

    const oncekiPlaniYukle = useCallback(async () => {
        try {
            const res = await axios.get(`http://localhost:3001/api/sinav-oturma/${sinavId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });

            if (!Array.isArray(res.data) || res.data.length === 0) return;

            const planlar = {};
            planlar[seciliSinif] = res.data.map((s) => {
                const [sira, blok] = s.sira.split('-');
                return {
                    ogrenci_id: s.ogrenci_id,
                    ogrenci_ad: s.ogrenci_ad,
                    ogrenci_no: s.ogrenci_no,
                    sira: parseInt(sira),
                    blok: parseInt(blok),
                    koltuk: s.kolon
                };
            });

            setSeatingPlans(planlar);
            setGozcu(res.data[0]?.gozcu || 'Tanımsız');
            setSinavAdi(res.data[0]?.ders_adi || `Sınav ${sinavId}`);
            setToplamOgrenci(planlar[seciliSinif].length);
            setKapasite(sinifDuzenleri[seciliSinif].layout.reduce((a, b) => a + b, 0) * sinifDuzenleri[seciliSinif].sira);
            setShow(true);
        } catch (err) {
            console.warn("Önceki oturma planı bulunamadı.");
        }
    }, [sinavId, token, seciliSinif, sinifDuzenleri]);

    useEffect(() => {
        if (sinavId) {
            oncekiPlaniYukle();
        }
    }, [sinavId, oncekiPlaniYukle]);

    const olusturOturmaDuzeni = async () => {
        try {
            const response = await axios.post(
                `http://localhost:3001/api/sinav-oturma/olustur/${sinavId}`,
                { sinif: seciliSinif },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            setSeatingPlans(response.data.seatingPlans);
            setGozcu(response.data.gozcu);
            setToplamOgrenci(response.data.toplam_ogrenci);
            setKapasite(response.data.toplam_kapasite);
            setSinavAdi(response.data.ders_adi || `Sınav ${sinavId}`);
            setShow(true);
        } catch (error) {
            alert('Oturma düzeni oluşturulamadı: ' + (error.response?.data?.message || error.message));
        }
    };

    const handlePrint = () => {
        window.print();
    };

    const handlePdfExport = () => {
        const input = printRef.current;
        const pdf = new jsPDF('p', 'mm', 'a4');

        html2canvas(input, { scale: 1.2 }).then((canvas) => {
            const imgData = canvas.toDataURL('image/png');
            const imgProps = pdf.getImageProperties(imgData);
            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
            const scaleRatio = 0.75;
            const totalPages = Math.ceil((pdfHeight * scaleRatio) / pdf.internal.pageSize.getHeight());

            for (let i = 0; i < totalPages; i++) {
                if (i > 0) pdf.addPage();
                pdf.addImage(
                    imgData,
                    'PNG',
                    0,
                    -i * pdf.internal.pageSize.getHeight(),
                    pdfWidth * scaleRatio,
                    pdfHeight * scaleRatio
                );
            }

            pdf.save(`Sinav-Oturma-${sinavAdi || sinavId}.pdf`);
        });
    };

    return (
        <div className="sinav-oturma-container">
            <h2>Sınav Oturma Düzeni Oluştur</h2>

            <input
                type="text"
                placeholder="Sınav ID giriniz"
                value={sinavId}
                onChange={(e) => setSinavId(e.target.value)}
            />

            <select value={seciliSinif} onChange={(e) => setSeciliSinif(e.target.value)}>
                <option value="amfi1">Amfi-1</option>
                <option value="108">108</option>
            </select>

            {role !== 'ogretim_elemani' && (
                <button onClick={olusturOturmaDuzeni}>Oturma Düzeni Oluştur</button>
            )}

            {show && (
                <>
                    <div className="sinav-oturma-output" ref={printRef}>
                        <h3>Sınav: {sinavAdi}</h3>
                        <h3>Gözetmen: {gozcu}</h3>
                        <p>Toplam Öğrenci: {toplamOgrenci} / Kapasite: {kapasite}</p>

                        {Object.entries(seatingPlans).map(([sinif, plan]) => {
                            const layout = sinifDuzenleri[sinif]?.layout || [1];
                            const sira = sinifDuzenleri[sinif]?.sira || 1;
                            return (
                                <div key={sinif}>
                                    <h3>{sinif.toUpperCase()} Sınıfı</h3>
                                    <div className="sinav-oturma-wrapper">
                                        {[...Array(sira)].map((_, rowIdx) => (
                                            <div key={rowIdx} className="sinav-oturma-row">
                                                {layout.map((koltukSayisi, blokIdx) => (
                                                    <div key={blokIdx} className="sinav-oturma-block">
                                                        {[...Array(koltukSayisi)].map((_, koltukIdx) => {
                                                            const seat = plan.find(
                                                                s => s.sira === rowIdx + 1 &&
                                                                    s.blok === blokIdx + 1 &&
                                                                    s.koltuk === koltukIdx + 1
                                                            );
                                                            return seat ? (
                                                                <div key={koltukIdx} className="sinav-oturma-seat">
                                                                    <strong>{seat.ogrenci_ad}</strong>
                                                                    <span className="ogrenci-no">{seat.ogrenci_no}</span>
                                                                    <span>{seat.sira}-{seat.blok}-{seat.koltuk}</span>
                                                                </div>
                                                            ) : (
                                                                <div key={koltukIdx} className="sinav-oturma-seat bos">Boş</div>
                                                            );
                                                        })}
                                                    </div>
                                                ))}
                                            </div>
                                        ))}
                                    </div>

                                    <h3 className="liste-baslik">{sinif.toUpperCase()} Öğrenci Listesi</h3>
                                    <table className="sinav-ogrenci-tablosu">
                                        <thead>
                                            <tr>
                                                <th>#</th>
                                                <th>Ad Soyad</th>
                                                <th>Öğrenci No</th>
                                                <th>Sıra</th>
                                                <th>Blok</th>
                                                <th>Koltuk</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {plan.map((seat, idx) => (
                                                <tr key={idx}>
                                                    <td>{idx + 1}</td>
                                                    <td>{seat.ogrenci_ad}</td>
                                                    <td>{seat.ogrenci_no}</td>
                                                    <td>{seat.sira}</td>
                                                    <td>{seat.blok}</td>
                                                    <td>{seat.koltuk}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
                        <button onClick={handlePrint} className="sinav-oturma-print-btn">Yazdır</button>
                        <button onClick={handlePdfExport} className="sinav-oturma-print-btn">PDF Olarak Kaydet</button>
                    </div>
                </>
            )}
        </div>
    );
}

export default SinavOturma;
