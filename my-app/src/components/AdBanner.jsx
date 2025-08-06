import React from "react";
import AdSense from "react-adsense";

const AdBanner = () => {
    return (
        <div className="ad-container" style={{ margin: "20px 0" }}>
            <AdSense.Google
                client="ca-pub-6848142315187904"
                slot="8265609965"
                style={{ display: 'block' }}
                format="auto"
                responsive="true"
            />
        </div>
    );
};

export default AdBanner;
