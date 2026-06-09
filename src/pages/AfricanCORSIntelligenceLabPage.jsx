import React from 'react';
import { useSearchParams } from 'react-router-dom';
import OperationalServicesNav from '../components/OperationalServicesNav.jsx';
import NationalCorsPageHeader from '../components/nationalCors/NationalCorsPageHeader.jsx';
import NationalCorsStatusBanners from '../components/nationalCors/NationalCorsStatusBanners.jsx';
import NationalCorsLabWorkspace from '../components/nationalCors/NationalCorsLabWorkspace.jsx';
import { NationalServiceHero } from '../components/nationalCors/NationalCorsServicePanels.jsx';
import { useNationalCorsLab } from '../hooks/useNationalCorsLab.js';
import '../styles/cors-intelligence-lab.css';

export default function AfricanCORSIntelligenceLabPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const lab = useNationalCorsLab(searchParams, setSearchParams);

  return (
    <div className="cil-page">
      <NationalCorsPageHeader
        liveMode={lab.liveMode}
        setLiveMode={lab.setLiveMode}
        setApiError={lab.setApiError}
        refreshPageData={lab.refreshPageData}
        loading={lab.loading}
        gnssRefreshing={lab.gnssRefreshing}
      />

      <div className="cil-breadcrumb">
        ZimCORS national network <span>›</span> Select station and application <span>›</span> Run analysis
      </div>

      <NationalServiceHero
        regionId={lab.regionId}
        metrics={lab.metrics}
        healthPayload={lab.healthPayload}
        liveMode={lab.liveMode}
        loading={lab.loading}
        copyShareLink={lab.copyShareLink}
        shareCopied={lab.shareCopied}
      />

      <NationalCorsStatusBanners
        liveMode={lab.liveMode}
        healthPayload={lab.healthPayload}
        liveError={lab.liveError}
        gnssCatalog={lab.gnssCatalog}
        gnssRefreshing={lab.gnssRefreshing}
        apiError={lab.apiError}
        corsAnalysisResult={lab.corsAnalysisResult}
        setCorsAnalysisResult={lab.setCorsAnalysisResult}
        refreshPageData={lab.refreshPageData}
        loading={lab.loading}
      />

      <NationalCorsLabWorkspace lab={lab} />
    </div>
  );
}
