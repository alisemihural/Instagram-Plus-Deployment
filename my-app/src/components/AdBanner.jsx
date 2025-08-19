import React from "react";
import { Adsense } from '@ctrl/react-adsense';
import './AdBanner.css';

const AdBanner = ({ 
    client = "ca-pub-6848142315187904", 
    slot = "8265609965", 
    format = "auto",
    responsive = true,
    style = {},
    className = ""
}) => {
    return (
        <div className={`ad-container ${className}`} style={{ margin: "20px 0", ...style }}>
            <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px', textAlign: 'center' }}>
                Advertisement
            </div>
            <Adsense
                client={client}
                slot={slot}
                style={{ display: 'block' }}
                format={format}
                responsive={responsive}
            />
        </div>
    );
};

// Left sidebar ad banner
export const LeftAdBanner = () => (
    <AdBanner 
        client="ca-pub-6848142315187904"
        slot="8265609965"
        format="auto"
        className="left-ad"
        style={{ 
            width: '300px',
            height: '990px',
            position: 'sticky',
            top: '20px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '10px'
        }}
    />
);

// Right sidebar ad banner
export const RightAdBanner = () => (
    <AdBanner 
        client="ca-pub-6848142315187904"
        slot="8265609965"
        format="auto"
        className="right-ad"
        style={{ 
            width: '300px',
            height: '900px',
            position: 'sticky',
            top: '20px',
            backgroundColor: '#f8f9fa',
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            padding: '10px'
        }}
    />
);

export default AdBanner;
