import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { Helmet } from 'react-helmet-async';

const Index = () => {
  return (
    <>
      <Helmet>
        <title>Join Homemade Chefs - Start Your Home Restaurant</title>
        <meta name="description" content="Launch your home restaurant with Homemade Chefs. Simple onboarding, AI-powered tools, and full support to get you cooking and selling in no time." />
      </Helmet>
      <OnboardingWizard />
    </>
  );
};

export default Index;
