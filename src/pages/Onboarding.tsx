import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Helmet } from 'react-helmet-async';

const Onboarding = () => {
  return (
    <>
      <Helmet>
        <title>Complete Your Profile - Home-Made-Chef</title>
        <meta name="description" content="Set up your home restaurant profile with Home-Made-Chef. Quick onboarding, AI-powered menu generation, and full support." />
      </Helmet>
      <OnboardingWizard />
    </>
  );
};

export default Onboarding;
