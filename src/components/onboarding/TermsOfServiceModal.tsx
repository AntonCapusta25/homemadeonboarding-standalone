import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useTranslation } from 'react-i18next';
import { Loader2, FileText, CheckCircle } from 'lucide-react';
import { PlanType } from '@/types/onboarding';

interface TermsOfServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: () => void;
  plan: PlanType;
  chefName?: string;
  loading?: boolean;
}

// Plan-specific variables for yearly contracts
const getPlanVariables = (plan: PlanType) => {
  const variables: Record<string, any> = {
    'basic': {
      planName: 'Basic Chef Plan',
      commission: '10%',
      consultingHours: '2 hours',
      menuItems: 'Up to 8 items',
      adCreatives: '1 promotional video',
      features: `Consulting Hours Per Month: A minimum of 2 hours of professional consulting each month to assist with the Chef's culinary and business endeavors.

Branding Package: Access to a standard branding package designed to support the Chef's presence on the Homemade platform.

Menu Items: Permission to list up to 8 menu items for availability through the Homemade platform.

Ad Creatives per Month: Provision of 1 promotional video per month to assist with marketing and promotion of the Chef's menu items.

Platform Support: Access to KVK & NVWA support, menu & pricing support, invoicing & financials, dashboard & analytics.

Recognition: Standard recognition for achieving performance milestones.`,
      performanceTargets: '85% order acceptance rate, maximum 10% cancellation rate, 3.5+ star rating',
      upgradeOptions: 'The Chef is entitled to upgrade their agreement at any time during this Agreement to any of the higher packages offered by Homemade with appropriate notice.'
    },
    'pro': {
      planName: 'Pro Chef Plan',
      commission: '12%',
      consultingHours: '4 hours',
      menuItems: 'Unlimited',
      adCreatives: '2 promotional videos',
      features: `Consulting Hours Per Month: A minimum of 4 hours of professional consulting each month to assist with the Chef's culinary and business endeavors.

Branding Package: Access to an enhanced branding package designed to enhance the Chef's personal and professional brand presence on the Homemade platform.

Menu Items: Permission to list an unlimited number of menu items for availability through the Homemade platform, providing a diverse selection to customers.

Ad Creatives per Month: Provision of 2 promotional videos per month to assist with marketing and promotion of the Chef's menu items.

Homemade Feature: Featured once per month on the social media account of Homemade B.V.

Access to Training Sessions: Chef is granted access to training sessions on the web platform of Homemade B.V.

Enhanced Support: Priority support with performance coaching.`,
      performanceTargets: '90% order acceptance rate, maximum 7% cancellation rate, 4.0+ star rating',
      upgradeOptions: 'The Chef is entitled to upgrade to Pro Chef Plus or downgrade to Basic Chef at any time during this Agreement with appropriate notice.'
    },
    'advanced': {
      planName: 'Pro Chef Plus Plan',
      commission: '14%',
      consultingHours: '6+ hours',
      menuItems: 'Unlimited',
      adCreatives: '3+ promotional videos',
      features: `Consulting Hours Per Month: A minimum of 6+ hours of professional consulting each month to assist with the Chef's culinary and business endeavors.

Branding Package: Access to a premium branding package designed to provide superior brand presence on the Homemade platform.

Menu Items: Permission to list an unlimited number of menu items for availability through the Homemade platform, providing maximum flexibility and diverse selection to customers.

Ad Creatives per Month: Provision of 3+ promotional videos per month to assist with comprehensive marketing and promotion of the Chef's menu items.

Homemade Feature: Featured 3 times per month on the social media account of Homemade B.V., providing maximum visibility.

Access to Training Sessions: Chef is granted access to all training sessions on the web platform of Homemade B.V.

B2B Catering Opportunities: Access to business-to-business catering opportunities.

Priority Positioning: Priority positioning in search results on the Platform.

Advanced Dashboard & Analytics: Enhanced analytics tools for business optimization.

Dedicated Support: Dedicated account management for optimization with premium support.

Performance Bonuses: Eligible for homepage features, premium badges, and plan upgrades based on revenue, ratings, and order volume milestones.`,
      performanceTargets: '95% order acceptance rate, maximum 5% cancellation rate, 4.2+ star rating',
      upgradeOptions: 'The Chef is entitled to downgrade to Pro Chef or Basic Chef at any time during this Agreement with appropriate notice.'
    },
  };

  return variables[plan] || variables['advanced'];
};

// Generate the yearly contract text
const generateContract = (vars: any) => {
  return `CONTRACT FOR ${vars.planName.toUpperCase()}

Company name: Homemade B.V
Company address: Klokkenplas 40-1, 7511 NN Enschede

PREAMBLE

This Agreement is explicitly designed for hobby chefs who wish to share meals with their local community. The activities under this Agreement are considered non-commercial, hobby-level engagements, and are not intended to create an employment relationship or a formal commercial enterprise. Any compensation received is considered cost recovery and not a commercial wage or salary.

This Agreement ("Agreement") is entered into by and between Homemade B.V. ("Homemade") and the Chef.

DEFINITIONS

For the purposes of this Agreement, the following terms shall have the meanings set forth below:

a. "Homemade" refers to Homemade B.V., the online platform that connects freelance hobby chefs with customers in their local communities.

b. "Chef" or "Hobby Chef" refers to the individual who provides culinary services through the Homemade platform on a hobby basis, primarily for passion and community engagement, not for profit maximization.

c. "Platform" refers to Homemade's software, website, mobile applications, and related online services and tools.

d. "Services" or "Hobby Activity" refers to the culinary and related services provided by the Chef through the Homemade platform on a hobby basis, intended to be cost-covering rather than profit-oriented.

e. "Agreement" refers to this contract, which sets forth the terms and conditions governing the relationship between Homemade and the Chef.

f. "Commission" refers to the percentage fee retained by Homemade from each Customer order (inclusive of VAT and delivery charges). Under this Agreement, the commission rate is ${vars.commission} (${vars.planName}).

g. "Customer Data" refers to any personal information, contact details, order history, or preferences of Platform users.

h. "Homemade Customer" refers to any Customer first acquired through the Platform or who places their first order via the Platform.

WARRANTIES AND REPRESENTATIONS

1. The Chef represents and warrants that they will comply with all applicable legal requirements for operating as a hobby chef, including mandatory food safety compliance (HACCP certification and NVWA registration). The Chef is fully and solely responsible for determining whether their income level requires business registration (KVK and BTW). Homemade does not require business registration unless mandated by Dutch law. The Chef is solely responsible for declaring all income and paying all applicable taxes.

INSURANCE

2. The Chef is strongly recommended to maintain, at their own expense, appropriate insurance coverage, including general liability and professional liability insurance, with limits not less than €1,000,000 per occurrence and in the aggregate, to protect themselves and Homemade from any claims arising from their Services. Without insurance, Chef bears full financial responsibility for all claims.

INDEMNIFICATION

3. The Chef shall indemnify, defend, and hold harmless Homemade, its officers, directors, employees, and agents, from and against any claims, damages, losses, liabilities, and expenses (including reasonable attorney fees) arising from or related to: (a) food safety incidents, (b) regulatory violations, (c) breach of this Agreement, (d) third-party claims, or (e) any violation of applicable laws and regulations.

RELATIONSHIP OF THE PARTIES

4. The Chef is an independent contractor acting on a hobby basis and is not an employee, agent, or representative of Homemade. The Chef shall not represent themselves as such, and nothing in this Agreement shall be construed as creating an employer-employee relationship between the parties. The Chef shall be solely responsible for all taxes, social security contributions, and other government fees and charges arising from their provision of Services. The Chef is solely responsible for setting meal prices based on their own costs.

HACCP AND FOOD SAFETY COMPLIANCE

5. The Chef agrees to abide by the HACCP guidelines and all other applicable food safety laws and regulations, including Dutch HACCP guidelines, EU food safety legislation (Regulation 852/2004), all NVWA requirements, and proper allergen labeling for all 14 EU allergens on every item. The Chef bears full legal, civil, and social responsibility for compliance, and Homemade is expressly released from any liability related to food safety violations.

LIMITATION OF LIABILITY

6. Homemade is not liable for health and safety violations and is not legally responsible for any such violations. The Chef shall be solely responsible for maintaining the safety and cleanliness of their workspace and ensuring that their Services meet all applicable food safety standards. Homemade's total liability is limited to the lesser of: total Commission fees paid by Chef in the 12 months preceding the claim, €5,000 per incident, or €10,000 aggregate in any calendar year.

CUSTOMER RATINGS

7. The Chef understands that their meals will be rated based on customer feedback regarding the quality of service, explicitly judging the food based on Delivery and Packing, Tastiness, and Freshness. Ratings are not subject to alteration by Homemade, do not reflect the opinions of Homemade, and are solely based on customer feedback.

ACTIVITY REQUIREMENTS

8. The Chef is allowed to work flexible hours and choose when their meals are listed on the platform. The Chef must notify Homemade at least one week in advance of any changes to their availability or meal listings. The Chef is advised to maintain active listing minimum 5 hours per week unless special circumstances occur (planned absences, emergencies, approved leave, or technical issues). This is to avoid an inactivity fee of up to €20 per month from Homemade. A 7-day grace period applies to first-time violations or documented emergencies. ${vars.planName} performance targets: ${vars.performanceTargets}.

PAYMENTS AND COMMISSIONS

9. The Chef irrevocably appoints Homemade as their exclusive agent to collect all Customer payments on their behalf. Payments will be paid to the Chef after Homemade receives an invoice or reverse-invoice from the Chef.

The Chef will pay a commission rate of ${vars.commission} of gross order value (including delivery and VAT) per order made through the platform.

Additional fees: Failed Payout €10, Chargeback Handling €15, Off-Platform Sale up to €500 or 1-month gross sales (whichever higher), Customer Data Misuse €1,000 per affected customer, Unauthorized Use of Homemade Content €500 + actual damages.

PACKAGING AND UTENSILS

10. The Chef understands that Homemade can provide packaging and utensils for an additional price, according to supplemental packages.

LIMITED NON-COMPETITION REGARDING HOMEMADE CUSTOMERS

11. The Chef is free to conduct their culinary business outside of the Homemade platform and work with any other customers or platforms. However, any customer acquired through or introduced by the Homemade platform is considered a "Homemade Customer." The Chef shall not direct Homemade Customers to order outside the Platform, share personal contact information for off-platform orders, or solicit Platform Customers for non-Platform services. A 30-day grace period applies to existing customer relationships predating Platform registration (documentation required). Violation of this clause can result in liquidated damages of up to €500 minimum per violation OR one month's gross sales to that Customer (whichever is higher), plus lost commission and legal costs. Penalties may be reduced or waived when Chef can prove no intentional violation or circumstances beyond their control.

BRANDING AND MARKETING

12. The Chef understands that Homemade will provide branding package and marketing solutions as specified in the ${vars.planName}. In consideration for receiving Homemade's marketing support, the Chef shall give priority to the Homemade link on any social media platforms or personal websites and clearly mention the Homemade app or platform in social media captions. Failure to comply may result in suspension of marketing benefits. Upon termination, Chef must immediately cease all use of marketing videos, professional photos, branded materials, and any derivative works created by Homemade. Chef retains ownership of original recipes and personal photos.

FREELANCE CHEF STATUS

13. The Chef understands that Homemade is a platform that enables them to work as freelance hobby chefs and engage in business with customers from their local community.

SUSTAINABLE AND LOCAL INGREDIENTS

14. The Chef agrees to prioritize using ingredients with green and eco labels, such as fair trade labels, and fresh ingredients sourced from local grocery stores to reduce emissions and supply chain distance.

TRANSACTION RECORDKEEPING

15. The Chef is obligated to request, receive, and file all transactions with Homemade customers through the Homemade platform or inform Homemade in the case of an external event or catering.

HOMEMADE SUPPORT

16. In return for the Chef's compliance with this Agreement, Homemade will provide the services and benefits such as marketing, branding, and advisory support as specified in the ${vars.planName}.

TERMINATION AND DATA PROTECTION

17. The Chef understands that in the event of termination of this Agreement, they are required to delete all Customer data acquired on the Homemade platform within 30 days, provide written confirmation of data deletion if requested, stop all contact with Homemade Customers, cease all use of Platform and Homemade branding, and return any Platform materials. Any breach will result in €1,000 liquidated damages per affected Customer plus legal action. Chef becomes a data controller when downloading Customer data and must process data only for order fulfillment, implement security measures, and notify Homemade within 72 hours of any data breach.

TERM AND RENEWAL

18. This Agreement is valid for a period of one year (12 months), commencing on the date of signing. At the end of the one year, this Agreement may be renewed upon the mutual agreement of both parties in writing. Annual plans do NOT automatically renew. In the case that the Chef is not making over €300 per month average when the 6-month point is reached, they have the right to cancel the contract by providing written notice within 14 days after Month 6 revenue report and 30 days advance notice of departure. Any renewal of this Agreement shall be subject to the terms and conditions set forth in this Agreement or as otherwise agreed upon in writing by both parties.

EARLY TERMINATION

19. Either party may terminate for material breach (30-day cure period), health/safety violations (immediate), three-strike violations (15 days notice), loss of required licenses, or bankruptcy. If Chef terminates without cause, early termination fee calculated as documented onboarding/support hours × €20 (ex VAT), with maximum cap of lesser of: 50% of projected Commission for remaining term OR €1,000 total. No fee if Chef proves Homemade material breach. Final payouts within 45 days after account closure.

CONFIDENTIALITY

20. The Chef agrees to maintain the confidentiality of any proprietary or confidential information of Homemade that they may receive during the term of this Agreement. The Chef shall not disclose such information to any third party without the prior written consent of Homemade, and shall take all reasonable precautions to prevent unauthorized access or disclosure. Obligations survive termination for 3 years.

INTELLECTUAL PROPERTY

21. The Chef acknowledges that Homemade owns all rights, title, and interest in and to the Homemade name, logo, trademarks, copyrights, and other intellectual property related to the Homemade platform, including the marketing creatives developed by Homemade. The Chef shall not use such intellectual property except as expressly authorized by Homemade in writing. Chef retains ownership of original recipes, food preparations, personal branding, and pre-existing business assets.

GOVERNING LAW AND DISPUTE RESOLUTION

22. This Agreement shall be governed by and construed in accordance with the laws of the Netherlands. Parties agree to resolve disputes exclusively through binding arbitration under Netherlands Arbitration Institute (NAI) rules (Amsterdam seat, Dutch or English language, single arbitrator for claims < €25,000), except where mandatory Dutch or EU law grants access to court proceedings. Chef waives the right to participate in class actions. Homemade may seek immediate court relief for IP violations, data breaches, off-platform solicitation, or health/safety emergencies. Prevailing party recovers attorney fees. All claims must be brought within 12 months of incident.

NOTICES

23. Any notices required or permitted to be given under this Agreement shall be in writing and shall be deemed duly given if delivered personally, sent by email with confirmed receipt, or sent by registered or certified mail, postage prepaid, return receipt requested, addressed to: Homemade B.V., Witbrueksweg 383-403, Netherlands, Email: info@homemademeals.net. Chef must maintain current contact details in Chef Dashboard.

ENTIRE AGREEMENT

24. This Agreement, including any attachments or exhibits, constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior and contemporaneous agreements, understandings, negotiations, and discussions, whether oral or written, between the parties relating to the subject matter hereof.

AMENDMENT

25. This Agreement may be amended only by a written instrument signed by both parties. Homemade may update Terms with 14 days advance notice. Material changes require explicit acceptance for existing contracts. Commission rate changes apply only to new contracts unless separately agreed.

WAIVER

26. No waiver of any provision of this Agreement shall be deemed, or shall constitute, a waiver of any other provision, whether or not similar, nor shall any waiver constitute a continuing waiver. No waiver shall be binding unless executed in writing by the party making the waiver.

SEVERABILITY

27. If any provision of this Agreement is held by a court of competent jurisdiction to be invalid or unenforceable, the remaining provisions shall continue in full force and effect, and the invalid or unenforceable provision shall be deemed modified to the minimum extent necessary to make it valid and enforceable, consistent with the intent of the parties.

FORCE MAJEURE

28. Neither party shall be liable for any delay or failure to perform any of its obligations under this Agreement if such delay or failure is due to circumstances beyond its reasonable control, including but not limited to natural disasters, government actions, pandemics, labor strikes, or cyberattacks. Affected party must use reasonable efforts to minimize impact and notify the other party. If events continue > 90 days, either party may terminate without penalty. Outstanding payouts remain due for fulfilled orders.

COUNTERPARTS

29. This Agreement may be executed in counterparts, each of which shall be deemed an original, but all of which together shall constitute one and the same instrument.

PLATFORM CONDUCT & ENFORCEMENT

30. Chef must maintain listing accuracy (pricing updated within 4 hours, accurate descriptions, real-time availability, professional photos). Platform ranking based on: geographical proximity, customer rating, preparation time, and order volume. Progressive enforcement system: Strike 1 (warning, 7-day corrective action, training module); Strike 2 (3-7 day suspension, performance improvement plan); Strike 3 (termination with 15 days notice, 30-day payout hold). Severe violations result in immediate termination. Appeals within 14 days, with independent review within 30 days and external mediation available.

TIER SERVICES

31. The Chef, upon agreeing to the ${vars.planName} (${vars.commission} commission), shall be entitled to the following services and commitments from Homemade:

${vars.features}

${vars.upgradeOptions}

The Chef's access to and use of the tier features are subject to the terms of the Agreement, including the ${vars.commission} commission rate specified in Section 9 for all orders made through the Homemade platform.

The Chef acknowledges the benefits of the ${vars.planName} and commits to actively engaging with the provided features to enhance their service delivery and customer satisfaction on the Homemade platform.

PAYMENT PROCESSING

32. Payments made on the Homemade platform take between 3 to 6 Dutch business days to process following the Chef's request for the funds through the form of a reverse invoice. Homemade is not obliged to file this in the form of a reverse invoice but offers it as an extra service to make it easier for chefs joining the platform. In the case that the Chef sends a traditional invoice to Homemade B.V., the processing time is between 2 to 6 Dutch business days. The Chef may request their payments weekly, bi-weekly, or monthly, where Homemade provides complete flexibility in that regard. Chef maintains full flexibility in payout frequency regardless of invoice method.`;
};

export function TermsOfServiceModal({ 
  isOpen, 
  onClose, 
  onAccept, 
  plan, 
  chefName,
  loading = false 
}: TermsOfServiceModalProps) {
  const { t } = useTranslation();
  const [signature, setSignature] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  const planVars = getPlanVariables(plan);
  const contractText = generateContract(planVars);

  const canAccept = signature.trim().length > 0 && termsAccepted && privacyAccepted;

  const handleAccept = () => {
    if (canAccept) {
      onAccept();
    }
  };

  const handleClose = () => {
    // Reset state on close
    setSignature('');
    setTermsAccepted(false);
    setPrivacyAccepted(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileText className="w-5 h-5 text-primary" />
            {t('tos.title', 'Terms of Service Agreement')}
          </DialogTitle>
          <DialogDescription>
            {t('tos.subtitle', 'Please read and accept the terms to complete your registration')}
          </DialogDescription>
        </DialogHeader>

        {/* Plan Summary Badge */}
        <div className="bg-primary/10 rounded-lg p-3 flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{t('tos.selectedPlan', 'Selected Plan')}</p>
            <p className="font-semibold text-foreground">{planVars.planName}</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">{t('tos.commission', 'Commission')}</p>
            <p className="font-bold text-primary text-lg">{planVars.commission}</p>
          </div>
        </div>

        {/* Contract Scroll Area */}
        <ScrollArea className="flex-1 border rounded-lg p-4 bg-muted/30 min-h-[300px] max-h-[400px]">
          <pre className="whitespace-pre-wrap text-xs font-mono text-foreground/80 leading-relaxed">
            {contractText}
          </pre>
        </ScrollArea>

        {/* Signature and Checkboxes */}
        <div className="space-y-4 pt-4 border-t">
          {/* Signature Field */}
          <div className="space-y-2">
            <Label htmlFor="signature" className="text-sm font-medium">
              {t('tos.signatureLabel', 'Type your full name to sign')} *
            </Label>
            <Input
              id="signature"
              placeholder={chefName || t('tos.signaturePlaceholder', 'Your full legal name')}
              value={signature}
              onChange={(e) => setSignature(e.target.value)}
              className="font-medium"
            />
          </div>

          {/* Terms Checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="terms"
              checked={termsAccepted}
              onCheckedChange={(checked) => setTermsAccepted(checked === true)}
            />
            <Label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
              {t('tos.termsCheckbox', 'I have read and agree to the Terms of Service agreement above')} *
            </Label>
          </div>

          {/* Privacy Checkbox */}
          <div className="flex items-start gap-3">
            <Checkbox
              id="privacy"
              checked={privacyAccepted}
              onCheckedChange={(checked) => setPrivacyAccepted(checked === true)}
            />
            <Label htmlFor="privacy" className="text-sm leading-tight cursor-pointer">
              {t('tos.privacyCheckbox', 'I agree to the Privacy Policy and consent to the processing of my personal data')} *
            </Label>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button 
            onClick={handleAccept} 
            disabled={!canAccept || loading}
            className="gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t('common.processing', 'Processing...')}
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                {t('tos.acceptButton', 'Accept & Complete')}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
