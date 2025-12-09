import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Helmet } from 'react-helmet-async';

const Onboarding = () => {
  return (
    <>
      <Helmet>
        <title>Complete Your Profile - Homemade Chef</title>
        <meta name="description" content="Set up your home restaurant profile with Homemade Chef. Quick onboarding, AI-powered menu generation, and full support." />
      </Helmet>
      <OnboardingWizard />
    </>
  );
};

export default Onboarding;
