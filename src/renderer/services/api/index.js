import { ApiService, setOn401 } from './client';
import { authAPI } from './auth';
import { emailVerificationAPI } from './emailVerification';
import { passwordResetAPI } from './passwordReset';
import { platformAPI } from './platformConnections';
import { crmAPI } from './crm';

export { ApiService, setOn401, authAPI, emailVerificationAPI, passwordResetAPI, platformAPI, crmAPI };
export default new ApiService();
