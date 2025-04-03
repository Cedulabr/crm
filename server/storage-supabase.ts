import { supabase } from './supabase';
import type { IStorage } from './storage';
import {
  Client,
  Product,
  Convenio,
  Bank,
  Proposal,
  Kanban,
  User,
  Organization,
  InsertClient,
  InsertProduct,
  InsertConvenio,
  InsertBank,
  InsertProposal,
  InsertKanban,
  InsertUser,
  InsertOrganization,
  RegisterUser,
  ClientWithKanban,
  ProposalWithDetails,
  UserWithOrganization,
  AuthData,
  FormTemplate,
  InsertFormTemplate,
  FormSubmission,
  InsertFormSubmission,
  FormFieldType
} from '@shared/schema';

export class SupabaseStorage implements IStorage {
  // ==================
  // Form Template methods
  // ==================
  
  async getFormTemplates(): Promise<FormTemplate[]> {
    console.log('Supabase: Buscando todos os modelos de formulário');
    
    const { data, error } = await supabase
      .from('form_templates')
      .select('*');
    
    if (error) throw error;
    if (!data) return [];
    
    return data.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description || null,
      kanbanColumn: template.kanban_column || "lead",
      fields: template.fields || [],
      active: template.active || false,
      createdById: template.created_by_id || null,
      organizationId: template.organization_id || null,
      createdAt: template.created_at ? new Date(template.created_at) : null,
      updatedAt: template.updated_at ? new Date(template.updated_at) : null
    }));
  }

  async getFormTemplate(id: number): Promise<FormTemplate | undefined> {
    console.log(`Supabase: Buscando modelo de formulário com ID ${id}`);
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      kanbanColumn: data.kanban_column || "lead",
      fields: data.fields,
      active: data.active,
      createdById: data.created_by_id,
      organizationId: data.organization_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    };
  }

  async createFormTemplate(template: InsertFormTemplate): Promise<FormTemplate> {
    console.log('Supabase: Criando novo modelo de formulário');
    const { data, error } = await supabase
      .from('form_templates')
      .insert({
        name: template.name,
        description: template.description,
        kanban_column: template.kanbanColumn,
        fields: template.fields,
        active: template.active,
        created_by_id: template.createdById,
        organization_id: template.organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      kanbanColumn: data.kanban_column || "lead",
      fields: data.fields,
      active: data.active,
      createdById: data.created_by_id,
      organizationId: data.organization_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    };
  }

  async updateFormTemplate(id: number, template: Partial<InsertFormTemplate>): Promise<FormTemplate | undefined> {
    console.log(`Supabase: Atualizando modelo de formulário com ID ${id}`);
    // Verificar se existe
    const existingTemplate = await this.getFormTemplate(id);
    if (!existingTemplate) return undefined;
    
    // Preparar objeto de atualização
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (template.name !== undefined) updateData.name = template.name;
    if (template.description !== undefined) updateData.description = template.description;
    if (template.kanbanColumn !== undefined) updateData.kanban_column = template.kanbanColumn;
    if (template.fields !== undefined) updateData.fields = template.fields;
    if (template.active !== undefined) updateData.active = template.active;
    if (template.createdById !== undefined) updateData.created_by_id = template.createdById;
    if (template.organizationId !== undefined) updateData.organization_id = template.organizationId;
    
    // Atualizar
    const { data, error } = await supabase
      .from('form_templates')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      kanbanColumn: data.kanban_column || "lead",
      fields: data.fields,
      active: data.active,
      createdById: data.created_by_id,
      organizationId: data.organization_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    };
  }

  async deleteFormTemplate(id: number): Promise<boolean> {
    console.log(`Supabase: Removendo modelo de formulário com ID ${id}`);
    
    // Primeiro, remover todas as submissões relacionadas
    await supabase
      .from('form_submissions')
      .delete()
      .eq('form_template_id', id);
    
    // Depois, remover o template
    const { error } = await supabase
      .from('form_templates')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  }

  async getFormTemplatesByOrganization(organizationId: number): Promise<FormTemplate[]> {
    console.log(`Supabase: Buscando modelos de formulário da organização ${organizationId}`);
    const { data, error } = await supabase
      .from('form_templates')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) throw error;
    
    return data.map(template => ({
      id: template.id,
      name: template.name,
      description: template.description || null,
      kanbanColumn: template.kanban_column || "lead",
      fields: template.fields || [],
      active: template.active || false,
      createdById: template.created_by_id || null,
      organizationId: template.organization_id || null,
      createdAt: template.created_at ? new Date(template.created_at) : null,
      updatedAt: template.updated_at ? new Date(template.updated_at) : null
    }));
  }
  
  // ==================
  // Form Submission methods
  // ==================
  
  async getFormSubmissions(): Promise<FormSubmission[]> {
    console.log('Supabase: Buscando todas as submissões de formulário');
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*');
    
    if (error) throw error;
    
    return data.map(submission => ({
      id: submission.id,
      formTemplateId: submission.form_template_id,
      data: submission.data,
      clientId: submission.client_id,
      status: submission.status,
      processedById: submission.processed_by_id,
      organizationId: submission.organization_id,
      createdAt: submission.created_at ? new Date(submission.created_at) : null,
      updatedAt: submission.updated_at ? new Date(submission.updated_at) : null
    }));
  }

  async getFormSubmission(id: number): Promise<FormSubmission | undefined> {
    console.log(`Supabase: Buscando submissão de formulário com ID ${id}`);
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    
    return {
      id: data.id,
      formTemplateId: data.form_template_id,
      data: data.data,
      clientId: data.client_id,
      status: data.status,
      processedById: data.processed_by_id,
      organizationId: data.organization_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    };
  }

  async createFormSubmission(submission: InsertFormSubmission): Promise<FormSubmission> {
    console.log('Supabase: Criando nova submissão de formulário');
    
    // Buscar o template para obter a organização
    let organizationId = submission.organizationId;
    if (submission.formTemplateId && !organizationId) {
      const template = await this.getFormTemplate(submission.formTemplateId);
      if (template) {
        organizationId = template.organizationId;
      }
    }
    
    const { data, error } = await supabase
      .from('form_submissions')
      .insert({
        form_template_id: submission.formTemplateId,
        data: submission.data,
        status: submission.status || 'novo',
        organization_id: organizationId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      formTemplateId: data.form_template_id,
      data: data.data,
      clientId: data.client_id,
      status: data.status,
      processedById: data.processed_by_id,
      organizationId: data.organization_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    };
  }

  async updateFormSubmissionStatus(id: number, status: string, processedById?: number): Promise<FormSubmission | undefined> {
    console.log(`Supabase: Atualizando status da submissão ${id} para ${status}`);
    // Verificar se existe
    const existingSubmission = await this.getFormSubmission(id);
    if (!existingSubmission) return undefined;
    
    // Preparar objeto de atualização
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    };
    
    if (processedById !== undefined) {
      updateData.processed_by_id = processedById;
    }
    
    // Atualizar
    const { data, error } = await supabase
      .from('form_submissions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      formTemplateId: data.form_template_id,
      data: data.data,
      clientId: data.client_id,
      status: data.status,
      processedById: data.processed_by_id,
      organizationId: data.organization_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    };
  }

  async processFormSubmission(id: number, processedById: number): Promise<{client: Client, submission: FormSubmission} | undefined> {
    console.log(`Supabase: Processando submissão ${id} para criar cliente`);
    
    // Buscar a submissão
    const submission = await this.getFormSubmission(id);
    if (!submission) {
      console.error(`Submissão ${id} não encontrada`);
      return undefined;
    }
    
    // Buscar o template para informações adicionais
    const template = await this.getFormTemplate(submission.formTemplateId || 0);
    if (!template) {
      console.error(`Template da submissão ${id} não encontrado`);
      return undefined;
    }
    
    // Tipagem segura para dados do formulário
    const formData = submission.data as Record<string, any>;
    
    // Criar um novo cliente com os dados do formulário
    const client = await this.createClient({
      name: formData.name || '',
      email: formData.email || null,
      phone: formData.phone || null,
      cpf: formData.cpf || null,
      birthDate: formData.birthDate || null,
      convenioId: formData.convenioId || null,
      contact: formData.contact || null,
      company: formData.company || null,
      organizationId: submission.organizationId || null,
      createdById: processedById
    });
    
    // Atualizar a submissão para processada e vinculá-la ao cliente
    const { data, error } = await supabase
      .from('form_submissions')
      .update({
        status: 'processado',
        client_id: client.id,
        processed_by_id: processedById,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error(`Erro ao atualizar submissão ${id} após processamento:`, error);
      return undefined;
    }
    
    const updatedSubmission: FormSubmission = {
      id: data.id,
      formTemplateId: data.form_template_id,
      data: data.data,
      clientId: data.client_id,
      status: data.status,
      processedById: data.processed_by_id,
      organizationId: data.organization_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    };
    
    return {
      client,
      submission: updatedSubmission
    };
  }

  async getFormSubmissionsByTemplate(templateId: number): Promise<FormSubmission[]> {
    console.log(`Supabase: Buscando submissões do template ${templateId}`);
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('form_template_id', templateId);
    
    if (error) throw error;
    
    return data.map(submission => ({
      id: submission.id,
      formTemplateId: submission.form_template_id,
      data: submission.data,
      clientId: submission.client_id,
      status: submission.status,
      processedById: submission.processed_by_id,
      organizationId: submission.organization_id,
      createdAt: submission.created_at ? new Date(submission.created_at) : null,
      updatedAt: submission.updated_at ? new Date(submission.updated_at) : null
    }));
  }

  async getFormSubmissionsByStatus(status: string): Promise<FormSubmission[]> {
    console.log(`Supabase: Buscando submissões com status ${status}`);
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('status', status);
    
    if (error) throw error;
    
    return data.map(submission => ({
      id: submission.id,
      formTemplateId: submission.form_template_id,
      data: submission.data,
      clientId: submission.client_id,
      status: submission.status,
      processedById: submission.processed_by_id,
      organizationId: submission.organization_id,
      createdAt: submission.created_at ? new Date(submission.created_at) : null,
      updatedAt: submission.updated_at ? new Date(submission.updated_at) : null
    }));
  }

  async getFormSubmissionsByOrganization(organizationId: number): Promise<FormSubmission[]> {
    console.log(`Supabase: Buscando submissões da organização ${organizationId}`);
    const { data, error } = await supabase
      .from('form_submissions')
      .select('*')
      .eq('organization_id', organizationId);
    
    if (error) throw error;
    
    return data.map(submission => ({
      id: submission.id,
      formTemplateId: submission.form_template_id,
      data: submission.data,
      clientId: submission.client_id,
      status: submission.status,
      processedById: submission.processed_by_id,
      organizationId: submission.organization_id,
      createdAt: submission.created_at ? new Date(submission.created_at) : null,
      updatedAt: submission.updated_at ? new Date(submission.updated_at) : null
    }));
  }

  // ==================
  // Client methods
  // ==================
  
  async getClients(): Promise<Client[]> {
    console.log('Supabase: Buscando todos os clientes');
    
    const { data, error } = await supabase
      .from('clients')
      .select('*');
    
    if (error) throw error;
    
    return data.map(client => ({
      id: client.id,
      name: client.name,
      email: client.email,
      phone: client.phone,
      cpf: client.cpf,
      birthDate: client.birth_date,
      convenioId: client.convenio_id,
      contact: client.contact,
      company: client.company,
      organizationId: client.organization_id,
      createdById: client.created_by_id,
      createdAt: client.created_at ? new Date(client.created_at) : null,
      updatedAt: client.updated_at ? new Date(client.updated_at) : null
    }));
  }

  async getClient(id: number): Promise<Client | undefined> {
    console.log(`Supabase: Buscando cliente com ID ${id}`);
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') return undefined;
      throw error;
    }
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      birthDate: data.birth_date,
      convenioId: data.convenio_id,
      contact: data.contact,
      company: data.company,
      organizationId: data.organization_id,
      createdById: data.created_by_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    };
  }

  async createClient(client: InsertClient): Promise<Client> {
    console.log('Supabase: Criando novo cliente');
    
    // Criar o cliente
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: client.name,
        email: client.email,
        phone: client.phone,
        cpf: client.cpf,
        birth_date: client.birthDate,
        convenio_id: client.convenioId,
        contact: client.contact,
        company: client.company,
        organization_id: client.organizationId,
        created_by_id: client.createdById,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (error) throw error;
    
    // Criar entrada correspondente no Kanban
    const kanbanEntry: InsertKanban = {
      clientId: data.id,
      column: 'lead',
      position: await this.getNextPositionForColumn('lead'),
      organizationId: client.organizationId,
      createdById: client.createdById
    };
    
    await this.createKanbanEntry(kanbanEntry);
    
    // Retornar o cliente criado
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      birthDate: data.birth_date,
      convenioId: data.convenio_id,
      contact: data.contact,
      company: data.company,
      organizationId: data.organization_id,
      createdById: data.created_by_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    };
  }

  async updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined> {
    console.log(`Supabase: Atualizando cliente com ID ${id}`);
    
    // Verificar se o cliente existe
    const existingClient = await this.getClient(id);
    if (!existingClient) return undefined;
    
    // Preparar objeto de atualização
    const updateData: any = {
      updated_at: new Date().toISOString()
    };
    
    if (client.name !== undefined) updateData.name = client.name;
    if (client.email !== undefined) updateData.email = client.email;
    if (client.phone !== undefined) updateData.phone = client.phone;
    if (client.cpf !== undefined) updateData.cpf = client.cpf;
    if (client.birthDate !== undefined) updateData.birth_date = client.birthDate;
    if (client.convenioId !== undefined) updateData.convenio_id = client.convenioId;
    if (client.contact !== undefined) updateData.contact = client.contact;
    if (client.company !== undefined) updateData.company = client.company;
    if (client.organizationId !== undefined) updateData.organization_id = client.organizationId;
    if (client.createdById !== undefined) updateData.created_by_id = client.createdById;
    
    // Atualizar o cliente
    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      cpf: data.cpf,
      birthDate: data.birth_date,
      convenioId: data.convenio_id,
      contact: data.contact,
      company: data.company,
      organizationId: data.organization_id,
      createdById: data.created_by_id,
      createdAt: data.created_at ? new Date(data.created_at) : null,
      updatedAt: data.updated_at ? new Date(data.updated_at) : null
    };
  }

  async deleteClient(id: number): Promise<boolean> {
    console.log(`Supabase: Removendo cliente com ID ${id}`);
    
    // Verificar se o cliente existe
    const client = await this.getClient(id);
    if (!client) return false;
    
    // Remover propostas associadas
    await supabase
      .from('proposals')
      .delete()
      .eq('client_id', id);
    
    // Remover entrada do kanban
    await supabase
      .from('kanban')
      .delete()
      .eq('client_id', id);
    
    // Remover cliente
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
    
    return true;
  }

  async getClientsWithKanban(): Promise<ClientWithKanban[]> {
    console.log('Supabase: Buscando clientes com informações de kanban');
    
    const { data, error } = await supabase
      .from('clients')
      .select(`
        *,
        kanban:kanban(*)
      `);
    
    if (error) throw error;
    
    return data.map(item => {
      const client: Client = {
        id: item.id,
        name: item.name,
        email: item.email,
        phone: item.phone,
        cpf: item.cpf,
        birthDate: item.birth_date,
        convenioId: item.convenio_id,
        contact: item.contact,
        company: item.company,
        organizationId: item.organization_id,
        createdById: item.created_by_id,
        createdAt: item.created_at ? new Date(item.created_at) : null,
        updatedAt: item.updated_at ? new Date(item.updated_at) : null
      };
      
      const kanban: Kanban | null = item.kanban.length > 0 ? {
        id: item.kanban[0].id,
        clientId: item.kanban[0].client_id,
        column: item.kanban[0].column,
        position: item.kanban[0].position,
        organizationId: item.kanban[0].organization_id,
        createdById: item.kanban[0].created_by_id,
        createdAt: item.kanban[0].created_at ? new Date(item.kanban[0].created_at) : null,
        updatedAt: item.kanban[0].updated_at ? new Date(item.kanban[0].updated_at) : null
      } : null;
      
      return { client, kanban };
    });
  }

  // ==================
  // Other methods
  // ==================
  
  // ...todos os outros métodos necessários para a interface IStorage
  
  // Método auxiliar
  private async getNextPositionForColumn(column: string): Promise<number> {
    const { data, error } = await supabase
      .from('kanban')
      .select('position')
      .eq('column', column)
      .order('position', { ascending: false })
      .limit(1);
    
    if (error) throw error;
    
    return data.length > 0 ? data[0].position + 1 : 0;
  }
}

// Criando e exportando uma instância da classe SupabaseStorage
export const supabaseStorage = new SupabaseStorage();